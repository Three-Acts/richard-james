import { useEffect, useRef } from 'react'
import Image from '@/components/ui/Image'
import type { ProjectContent } from '@/content/types'
import type { CarouselApi } from '@/lib/carousel/useCarousel'

/**
 * The fixed centre stage: every project's hero stacked absolutely, only the
 * active one visible via a buttery cross-fade driven from the scroll progress
 * stream (imperative — never re-renders the 25 <img>s). The active hero scales
 * + drifts a touch for life, sits under a soft vignette, and links to its
 * detail page.
 *
 * SSR / no-JS: the first hero is rendered fully opaque & wrapped in a real
 * <a>, so the page is never blank without JavaScript.
 */
export default function CenterStage({
  projects,
  activeIndex,
  api,
}: {
  projects: ProjectContent[]
  activeIndex: number
  api: CarouselApi
}) {
  const { registerFrame, reducedMotion } = api
  // Per-slide refs for the fade layer and the inner transform layer.
  const layerRefs = useRef<HTMLAnchorElement[]>([])
  const innerRefs = useRef<HTMLDivElement[]>([])

  const setLayer = (i: number) => (el: HTMLAnchorElement | null) => {
    if (el) layerRefs.current[i] = el
  }
  const setInner = (i: number) => (el: HTMLDivElement | null) => {
    if (el) innerRefs.current[i] = el
  }

  // Continuous, buttery cross-fade + parallax driven from the scroll stream.
  // Skipped under reduced motion (handled by the discrete effect below).
  useEffect(() => {
    if (reducedMotion) return
    const N = projects.length
    const lastN = Math.max(N - 1, 1)

    // Crossfade window: how far (in index units) a neighbour bleeds in.
    const FADE = 0.62

    const unsub = registerFrame((progress, _activeIndex, jump) => {
      const pos = progress * lastN // fractional index, 0..N-1

      // Programmatic long move (year filter, distant thumbnail, Home/End):
      // the rail glides the whole way, but the stage reads it as ONE step —
      // the outgoing and incoming heroes crossfade directly, using the same
      // falloff/parallax curves as a real one-step scroll, and nothing in
      // between flashes by.
      if (jump && jump.to !== jump.from) {
        const dir = Math.sign(jump.to - jump.from)
        const t = Math.min(1, Math.max(0, (pos - jump.from) / (jump.to - jump.from)))
        for (let i = 0; i < N; i++) {
          const layer = layerRefs.current[i]
          const inner = innerRefs.current[i]
          if (!layer) continue
          // Virtual one-step signed distance: outgoing walks 0 → 1 away,
          // incoming approaches 1 → 0 from the direction of travel.
          const s = i === jump.from ? -t * dir : i === jump.to ? (1 - t) * dir : null
          const d = s === null ? Infinity : Math.abs(s)
          const o = d >= FADE ? 0 : Math.pow(1 - d / FADE, 1.6)
          layer.style.opacity = o.toFixed(4)
          layer.style.pointerEvents = o > 0.5 ? 'auto' : 'none'
          layer.style.zIndex = String(Math.round(o * 100))
          if (inner) {
            const scale = 1.06 - 0.06 * o
            const ty = (s ?? 0) * 26
            inner.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
            inner.style.filter = `brightness(${(0.55 + 0.45 * o).toFixed(3)})`
          }
        }
        return
      }

      for (let i = 0; i < N; i++) {
        const layer = layerRefs.current[i]
        const inner = innerRefs.current[i]
        if (!layer) continue
        const d = Math.abs(i - pos)
        // Smooth falloff so only the active (and a sliver of neighbour) shows.
        const o = d >= FADE ? 0 : Math.pow(1 - d / FADE, 1.6)
        layer.style.opacity = o.toFixed(4)
        layer.style.pointerEvents = o > 0.5 ? 'auto' : 'none'
        layer.style.zIndex = String(Math.round(o * 100))
        if (inner) {
          // Subtle, signed parallax + scale: incoming slides settle from a
          // slightly larger, offset state.
          const signed = i - pos // negative = above, positive = below
          const scale = 1.06 - 0.06 * o // active ~1.00, dormant ~1.06
          const ty = signed * 26 // px drift in scroll direction
          inner.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
          // Faintly darken dormant frames so the active hero leads the eye.
          inner.style.filter = `brightness(${(0.55 + 0.45 * o).toFixed(3)})`
        }
      }
    })
    return unsub
  }, [projects.length, reducedMotion, registerFrame])

  // Reduced motion: scrolling still changes the work, but as a plain opacity
  // cut keyed off the (rounded) active index — no parallax, no scale drift.
  useEffect(() => {
    if (!reducedMotion) return
    layerRefs.current.forEach((layer, i) => {
      if (!layer) return
      const on = i === activeIndex
      layer.style.opacity = on ? '1' : '0'
      layer.style.pointerEvents = on ? 'auto' : 'none'
      layer.style.zIndex = on ? '100' : '0'
      const inner = innerRefs.current[i]
      if (inner) {
        inner.style.transform = 'translate3d(0,0,0) scale(1)'
        inner.style.filter = 'brightness(1)'
      }
    })
  }, [activeIndex, reducedMotion])

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

      <div className="relative h-[62vh] w-full max-w-[min(58rem,82vw)] md:h-[68vh]">
        {projects.map((p, i) => {
          const isFirst = i === 0
          return (
            <a
              key={p.slug}
              ref={setLayer(i)}
              href={`/projects/${p.slug}`}
              aria-label={`View ${p.title}`}
              tabIndex={i === activeIndex ? 0 : -1}
              draggable={false}
              className="group u-fill flex items-center justify-center outline-none"
              style={{
                // SSR/no-JS start state: only the first slide is visible.
                opacity: isFirst ? 1 : 0,
                pointerEvents: isFirst ? 'auto' : 'none',
                zIndex: isFirst ? 100 : 0,
                cursor: 'pointer',
              }}
              data-active={i === activeIndex || undefined}
            >
              <div
                ref={setInner(i)}
                className="relative flex h-full w-full items-center justify-center will-change-transform"
                style={{ transform: 'translate3d(0,0,0) scale(1)' }}
              >
                {/*
                  The shared <Image> forces its inner <img> to object-cover /
                  h-full w-full. For the centre hero we want the WHOLE artwork
                  (free-form, never cropped), so we size the wrapper to the
                  stage height and override the inner img to object-contain via
                  child-selector utilities.
                */}
                <Image
                  src={p.hero}
                  alt={p.title}
                  priority={i <= 1}
                  draggable={false}
                  sizes="(max-width: 768px) 82vw, 58rem"
                  className="!h-full !w-auto max-w-full !overflow-visible drop-shadow-[0_40px_120px_rgba(0,0,0,0.85)] [&>img]:!h-full [&>img]:!w-auto [&>img]:!max-w-full [&>img]:!object-contain"
                />
              </div>
              {/* focus ring for keyboard users — never on the image itself */}
              <span className="pointer-events-none absolute inset-0 rounded-sm ring-0 ring-gold/0 transition group-focus-visible:ring-1 group-focus-visible:ring-gold/60" />
            </a>
          )
        })}
      </div>

      {/* Soft cinematic vignette — pure decoration, above images, below UI. */}
      <div
        aria-hidden="true"
        className="u-fill z-[120]"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 46%, transparent 38%, rgba(11,11,12,0.55) 82%, rgba(11,11,12,0.92) 100%)',
        }}
      />
    </div>
  )
}
