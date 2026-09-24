import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, Observer, Draggable } from './gsapPlugins'
import { WheelClassifier, resolveSnap } from './wheel'

/**
 * The site's stepped-carousel core, rebuilt on GSAP's input stack.
 *
 * The position is CONTINUOUS: a gsap.ticker loop runs every frame, easing the
 * rendered position toward a target with time-based damping. Wheel input
 * moves the target directly; once input goes quiet the target becomes the
 * nearest step (biased by travel direction) and the same loop glides it home.
 * There are no settle timers and no commit/ease-back decisions — the carousel
 * is always drifting toward a resolved state, so it can never hold a frozen
 * half-transition.
 *
 * Responsibility split (one owner per input kind — running Observer and
 * Draggable over the same pointer events makes them fight):
 *
 *  - Observer owns the WHEEL. A pure classifier (wheel.ts) separates discrete
 *    mouse notches (one deliberate, fully tweened step each) from trackpad
 *    streams (which feed the lerped target). Smoothing never writes native
 *    scroll, which keeps wheel movement consistent on Windows.
 *  - Draggable + InertiaPlugin own POINTER and TOUCH, via the classic
 *    off-DOM proxy element: drag pixels map linearly onto the position, a
 *    release gets true momentum physics, snap() lands exactly on a step and
 *    edgeResistance rubber-bands past the ends.
 *  - Keyboard and programmatic navigation share one tween path.
 *
 * On a HORIZONTAL carousel the wheel adopts whichever axis carries the
 * gesture — a mouse's vertical-only wheel drives it just as naturally as a
 * trackpad's horizontal swipe.
 *
 * Every consumer renders from one broadcast frame stream (registerFrame), so
 * the stage, rail and title can never drift apart.
 */

export interface CarouselOptions {
  /** Gesture axis: 'y' (home stage) or 'x' (the lightbox coverflow). */
  axis: 'x' | 'y'
  /** Pixels of wheel movement that travel one complete step. */
  wheelSpan: number
  /** Pixels of pointer movement that move one complete step. */
  dragSpan: number
  /** Pointer movement required before a press becomes a drag (px). */
  dragMinimum: number
  /** Fraction of a step that belongs to the NEXT step when travelling toward
   *  it — lower = more eager to advance (see resolveSnap). */
  commitThreshold: number
  /** Damping of the lerp loop, per second — higher catches up faster. */
  damping: number
  /** Duration of the programmatic/notch step tween. */
  snapDuration: number
  /** GSAP ease of the programmatic/notch step tween. */
  snapEase: string
  /** How many steps a single drag/flick may travel (1 = deliberate). */
  maxDragSteps: number
  /** Draggable edge resistance past the first/last step (0..1). */
  edgeResistance: number
}

export const DEFAULT_CAROUSEL_OPTIONS: CarouselOptions = {
  axis: 'y',
  wheelSpan: 130,
  dragSpan: 88,
  dragMinimum: 6,
  commitThreshold: 0.5,
  damping: 7,
  snapDuration: 0.68,
  snapEase: 'power3.out',
  maxDragSteps: 1,
  edgeResistance: 0.82,
}

export type CarouselOverrides = Partial<CarouselOptions>

/**
 * A programmatic long move (year filter, distant thumbnail, Home/End). While
 * one is animating, frame consumers that render the continuous position may
 * instead crossfade straight between `from` and `to` — the position stream
 * still glides the full distance for consumers that want it (the rail).
 */
export interface CarouselJump {
  from: number
  to: number
}

type FrameCallback = (progress: number, activeIndex: number, jump: CarouselJump | null) => void

export interface CarouselApi {
  /** Attach to the element that owns wheel and pointer gestures. */
  stageRef: React.RefObject<HTMLDivElement | null>
  activeIndex: number
  progressRef: React.RefObject<number>
  registerFrame: (callback: FrameCallback) => () => void
  goToIndex: (index: number, options?: { immediate?: boolean }) => void
  ready: boolean
  reducedMotion: boolean
}

// Quiet time after the last stream delta before the target snaps to a step.
// Short: the snap is a gentle glide, not a decision the user waits on, and a
// continuing scroll simply re-grabs the target mid-drift.
const WHEEL_IDLE_MS = 140
// How far (in step units) a wheel gesture may rubber-band past either end.
const EDGE_OVERSHOOT = 0.12
// The target may not run further ahead of the rendered position than this —
// it bounds how fast works can flash by under a violent scroll.
const MAX_TARGET_LEAD = 2
// Below this distance the lerp lands exactly and stops emitting.
const REST_EPSILON = 0.0006

/** Whoever owns the position right now. The ticker only steers in 'free'. */
type Mode = 'free' | 'tween' | 'drag'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function useCarousel(
  count: number,
  initialIndex = 0,
  overrides: CarouselOverrides = {},
): CarouselApi {
  const stageRef = useRef<HTMLDivElement>(null)

  const options = useMemo(
    () => ({ ...DEFAULT_CAROUSEL_OPTIONS, ...overrides }),
    // The feel of a given carousel is fixed at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const lastIndex = Math.max(0, count - 1)
  const clampIndex = useCallback(
    (index: number) => clamp(Math.round(index), 0, lastIndex),
    [lastIndex],
  )

  // The one animated value plus its steering state. The lerp loop, the step
  // tween and drag each own `position` exclusively per `mode`.
  const state = useRef({
    position: clamp(Math.round(initialIndex), 0, Math.max(0, count - 1)),
    target: clamp(Math.round(initialIndex), 0, Math.max(0, count - 1)),
    committed: clamp(Math.round(initialIndex), 0, Math.max(0, count - 1)),
    mode: 'free' as Mode,
    lastWheelAt: 0,
    wheelDirection: 0,
  })

  const progressRef = useRef(lastIndex === 0 ? 0 : state.current.position / lastIndex)
  const activeRef = useRef(state.current.committed)
  const [activeIndex, setActiveIndex] = useState(state.current.committed)
  const [ready, setReady] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const reducedRef = useRef(false)

  const frameCallbacks = useRef<Set<FrameCallback>>(new Set())
  const jumpRef = useRef<CarouselJump | null>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const emit = useCallback(() => {
    const { position } = state.current
    progressRef.current = lastIndex === 0 ? 0 : position / lastIndex
    const jump = jumpRef.current
    let display = clampIndex(position)
    if (jump) {
      // During a jump the works in between are never "active": the announced
      // index flips once, at the crossfade midpoint.
      const span = jump.to - jump.from
      const t = span === 0 ? 1 : (position - jump.from) / span
      display = t >= 0.5 ? jump.to : jump.from
    }
    frameCallbacks.current.forEach((callback) =>
      callback(progressRef.current, display, jump),
    )
    if (display !== activeRef.current) {
      activeRef.current = display
      setActiveIndex(display)
    }
  }, [clampIndex, lastIndex])

  const registerFrame = useCallback((callback: FrameCallback) => {
    frameCallbacks.current.add(callback)
    callback(progressRef.current, activeRef.current, jumpRef.current)
    return () => frameCallbacks.current.delete(callback)
  }, [])

  const killTween = useCallback(() => {
    tweenRef.current?.kill()
    tweenRef.current = null
  }, [])

  /**
   * A gesture arriving mid-jump lands the carousel on whichever end the
   * crossfade is visually closest to, so the new gesture starts from what is
   * actually on screen rather than a fractional position deep in the list.
   */
  const interruptJump = useCallback(() => {
    const jump = jumpRef.current
    if (!jump) return
    jumpRef.current = null
    const span = jump.to - jump.from
    const t = span === 0 ? 1 : (state.current.position - jump.from) / span
    const landing = t >= 0.5 ? jump.to : jump.from
    state.current.position = landing
    state.current.target = landing
    state.current.committed = landing
    emit()
  }, [emit])

  /** Programmatic/notch/keyboard navigation: one controlled tween. */
  const animateTo = useCallback(
    (index: number, animateOptions?: { immediate?: boolean }) => {
      killTween()
      const s = state.current
      const target = clampIndex(index)
      s.committed = target
      s.target = target
      s.wheelDirection = 0
      s.lastWheelAt = 0

      if (animateOptions?.immediate || reducedRef.current) {
        jumpRef.current = null
        s.mode = 'free'
        s.position = target
        emit()
        return
      }

      const distance = Math.abs(target - s.position)
      if (distance < 0.0001) {
        jumpRef.current = null
        s.mode = 'free'
        s.position = target
        emit()
        return
      }

      // A long programmatic move still tweens the whole distance (the rail
      // glides through it), but consumers receive the jump descriptor so the
      // centre stage can render it as ONE crossfade instead of flickering
      // through every work in between.
      jumpRef.current =
        distance > 1.5 ? { from: activeRef.current, to: target } : null

      s.mode = 'tween'
      const duration = Math.max(
        0.28,
        options.snapDuration * Math.min(1, 0.55 + distance * 0.45),
      )
      tweenRef.current = gsap.to(s, {
        position: target,
        duration,
        ease: options.snapEase,
        overwrite: false,
        onUpdate: emit,
        onComplete: () => {
          tweenRef.current = null
          jumpRef.current = null
          s.mode = 'free'
          s.position = target
          s.target = target
          emit()
        },
      })
    },
    [clampIndex, emit, killTween, options],
  )

  const goToIndex = useCallback(
    (index: number, goOptions?: { immediate?: boolean }) => animateTo(index, goOptions),
    [animateTo],
  )

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = reduce
    setReducedMotion(reduce)
    setReady(true)
    emit()

    const horizontal = options.axis === 'x'
    const s = state.current
    const { wheelSpan, dragSpan, maxDragSteps, commitThreshold, damping } = options

    /* --------------------------- the lerp loop --------------------------- */

    // Runs every frame; steers only while the position is free (not owned by
    // a step tween or a finger). Damping is time-based, so the glide feels
    // identical at 60 and 120Hz.
    const tick = (_time: number, deltaMs: number) => {
      if (s.mode !== 'free') return

      // Input quiet → the target becomes a whole step and the same lerp
      // glides it home. The decision reads the TARGET (where the gesture
      // pointed), not the rendered position — a dropped frame must never
      // discard a swipe. Committing here (not on arrival) keeps notch and
      // keyboard steps anchored to where the glide is heading.
      if (!s.lastWheelAt || performance.now() - s.lastWheelAt > WHEEL_IDLE_MS) {
        const snapped = resolveSnap(s.target, s.wheelDirection, commitThreshold, lastIndex)
        s.target = snapped
        s.committed = snapped
      }

      const diff = s.target - s.position
      if (diff === 0) return
      if (Math.abs(diff) < REST_EPSILON) {
        s.position = s.target
        emit()
        return
      }
      const alpha = reducedRef.current ? 1 : 1 - Math.exp((-damping * deltaMs) / 1000)
      s.position += diff * alpha
      emit()
    }
    gsap.ticker.add(tick)

    /* ------------------------------ wheel ------------------------------ */

    const classifier = new WheelClassifier()

    // The target may rubber-band slightly past either end, with resistance.
    const applyEdges = (target: number) => {
      if (target < 0) return Math.max(-EDGE_OVERSHOOT, target * 0.3)
      if (target > lastIndex) {
        return Math.min(lastIndex + EDGE_OVERSHOOT, lastIndex + (target - lastIndex) * 0.3)
      }
      return target
    }

    const observer = Observer.create({
      target: stage,
      type: 'wheel',
      preventDefault: true,
      // The classifier reads the raw event stream — per-event deltas and
      // timing carry the notch/stream signal; Observer's default rAF
      // debouncing would merge events.
      debounce: false,
      onWheel: (self) => {
        if (s.mode === 'drag') return
        const event = self.event as WheelEvent
        // Mouse wheels only ever emit deltaY, so a horizontal stage adopts
        // whichever axis carries the gesture (trackpads swipe with deltaX).
        const raw = horizontal
          ? Math.abs(event.deltaX) >= Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY
          : event.deltaY
        const unit =
          event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? 16
            : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
              ? horizontal
                ? stage.clientWidth
                : stage.clientHeight
              : 1
        const delta = raw * unit
        const kind = classifier.classify({
          delta,
          time: event.timeStamp,
          discrete: event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL,
        })
        if (kind === 'ignore') return

        if (kind === 'notch') {
          // One physical notch = one deliberate, fully animated step.
          animateTo(s.committed + (delta > 0 ? 1 : -1))
          return
        }

        // Stream: reclaim the position if a tween owns it, then move the
        // target and let the loop chase it.
        if (s.mode === 'tween') {
          killTween()
          interruptJump()
          s.mode = 'free'
          s.target = s.position
        }
        s.lastWheelAt = performance.now()
        s.wheelDirection = Math.sign(delta)
        const lead = clamp(
          s.target + delta / wheelSpan,
          s.position - MAX_TARGET_LEAD,
          s.position + MAX_TARGET_LEAD,
        )
        s.target = applyEdges(lead)
      },
    })

    /* --------------------------- drag / touch --------------------------- */

    // Drag input is captured on an off-DOM proxy (never the stage itself):
    // proxy pixels map linearly onto the position, so InertiaPlugin's
    // momentum, snap and edge resistance all operate in position space.
    const proxy = document.createElement('div')
    let dragStart = 0
    let justDragged = false

    const align = (drag: Draggable) => {
      const value = horizontal ? drag.x : drag.y
      s.position = dragStart - value / dragSpan
      s.target = s.position
      emit()
    }

    const draggable = Draggable.create(proxy, {
      type: horizontal ? 'x' : 'y',
      trigger: stage,
      inertia: true,
      minimumMovement: options.dragMinimum,
      edgeResistance: options.edgeResistance,
      onPressInit(this: Draggable) {
        killTween()
        interruptJump()
        s.mode = 'drag'
        s.wheelDirection = 0
        s.lastWheelAt = 0
        dragStart = s.position
        gsap.set(proxy, { x: 0, y: 0 })

        // Bound the gesture to the steps it is allowed to travel, NOT to the
        // whole list. Previously a flick sailed visibly through every item
        // before snap() yanked it back to at most maxDragSteps — so the same
        // swipe felt wilder the more items a carousel held, which is exactly
        // the count-sensitivity it should never have had. With the bounds in
        // step space, edgeResistance now rubber-bands at the end of the
        // gesture's own range and one swipe reads identically at 3 items or 30.
        // Position maps as `dragStart - value / dragSpan`, so the axis bounds
        // invert: travelling toward a HIGHER index is a NEGATIVE proxy value.
        const nearest = Math.max(0, dragStart - maxDragSteps)
        const furthest = Math.min(lastIndex, dragStart + maxDragSteps)
        const lower = (dragStart - furthest) * dragSpan
        const upper = (dragStart - nearest) * dragSpan
        this.applyBounds(
          horizontal
            ? { minX: lower, maxX: upper }
            : { minY: lower, maxY: upper },
        )
      },
      onDrag(this: Draggable) {
        align(this)
      },
      onThrowUpdate(this: Draggable) {
        align(this)
      },
      snap(value: number) {
        // Inertia's natural landing, disciplined: at most maxDragSteps away,
        // inside the list, on a whole step. Commit here — the release is the
        // moment of decision, so even an interrupted throw never leaves the
        // logical index stale.
        const raw = dragStart - value / dragSpan
        const stepped = clamp(raw, dragStart - maxDragSteps, dragStart + maxDragSteps)
        const landing = clamp(Math.round(clamp(stepped, 0, lastIndex)), 0, lastIndex)
        s.committed = landing
        return (dragStart - landing) * dragSpan
      },
      onDragEnd() {
        justDragged = true
        window.setTimeout(() => {
          justDragged = false
        }, 0)
      },
      onRelease(this: Draggable) {
        // A press that never became a throw (a tap, or a cancelled drag)
        // frees the position; the loop glides it onto a whole step.
        if (!this.isThrowing) {
          s.target = s.position
          s.mode = 'free'
        }
      },
      onThrowComplete() {
        s.position = s.committed
        s.target = s.committed
        s.mode = 'free'
        emit()
      },
    })[0]

    // A drag that ends on a link must not read as a click on it. Draggable
    // suppresses most of these itself; the capture-phase guard covers the
    // rest (e.g. pointerup over a child anchor).
    const onClickCapture = (event: MouseEvent) => {
      if (!justDragged && !draggable.isThrowing) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onDragStartNative = (event: DragEvent) => event.preventDefault()

    stage.addEventListener('click', onClickCapture, true)
    stage.addEventListener('dragstart', onDragStartNative)

    const teardown = () => {
      gsap.ticker.remove(tick)
      observer.kill()
      draggable.kill()
      killTween()
      stage.removeEventListener('click', onClickCapture, true)
      stage.removeEventListener('dragstart', onDragStartNative)
    }

    // Astro's ClientRouter replaces the document body without unmounting React,
    // so this effect's cleanup would never run on a navigation away — leaving
    // the ticker callback and the Observer alive for the life of the tab. Tear
    // down on the swap as well; the island re-hydrates fresh on the next page.
    document.addEventListener('astro:before-swap', teardown, { once: true })

    return () => {
      document.removeEventListener('astro:before-swap', teardown)
      teardown()
    }
  }, [animateTo, clampIndex, emit, interruptJump, killTween, lastIndex, options])

  /* ------------------------------ keyboard ------------------------------ */

  useEffect(() => {
    const horizontal = options.axis === 'x'
    const forwardKey = horizontal ? 'ArrowRight' : 'ArrowDown'
    const backKey = horizontal ? 'ArrowLeft' : 'ArrowUp'

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      let next: number | null = null
      if (event.key === forwardKey || event.key === 'PageDown') {
        next = state.current.committed + 1
      } else if (event.key === backKey || event.key === 'PageUp') {
        next = state.current.committed - 1
      } else if (event.key === 'Home') {
        next = 0
      } else if (event.key === 'End') {
        next = lastIndex
      } else {
        return
      }
      event.preventDefault()
      animateTo(next)
    }
    const teardown = () => window.removeEventListener('keydown', onKeyDown)

    window.addEventListener('keydown', onKeyDown)
    // See the note above: a ClientRouter swap never unmounts the island, so the
    // key handler has to be dropped explicitly or it survives the navigation.
    document.addEventListener('astro:before-swap', teardown, { once: true })

    return () => {
      document.removeEventListener('astro:before-swap', teardown)
      teardown()
    }
  }, [animateTo, lastIndex, options.axis])

  return useMemo(
    () => ({
      stageRef,
      activeIndex,
      progressRef,
      registerFrame,
      goToIndex,
      ready,
      reducedMotion,
    }),
    [activeIndex, goToIndex, ready, reducedMotion, registerFrame],
  )
}
