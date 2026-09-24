/**
 * Pure wheel helpers for the site's carousels, DOM-free and unit-tested
 * (scripts/test-carousel.ts).
 *
 * WheelClassifier tells a discrete mouse notch (one deliberate step) from a
 * trackpad stream (continuous glide). That distinction is domain logic no
 * GSAP plugin provides: notches arrive as isolated large jumps (or line/page
 * deltaMode), trackpads flood small pixel deltas every frame.
 *
 * resolveSnap picks the step a free-gliding position should settle on once
 * input goes quiet, biased by the direction of travel.
 */

/** One normalised wheel event, in pixels (deltaMode already resolved). */
export interface WheelSample {
  delta: number
  time: number
  /** True for line/page deltaMode events — always a stepping device. */
  discrete: boolean
}

export type WheelKind = 'notch' | 'stream' | 'ignore'

// Discrete mouse notches arrive as isolated large jumps; a delta below this
// can only be a trackpad.
const NOTCH_MIN_DELTA = 80
// A notch is "isolated": anything following faster than this is a stream.
const NOTCH_MIN_GAP_MS = 60
// Real consecutive notches never arrive faster than this; a flick that
// briefly looked notch-like folds into the step already in flight.
const NOTCH_STEP_GAP_MS = 50
// Quiet gap after which the next wheel event is classified afresh.
const STREAM_RESET_MS = 220

export class WheelClassifier {
  private mode: 'notch' | 'smooth' | null = null
  private lastEventAt = 0
  private lastNotchAt = 0

  classify({ delta, time, discrete }: WheelSample): WheelKind {
    if (delta === 0) return 'ignore'

    const gap = this.lastEventAt ? time - this.lastEventAt : Infinity
    this.lastEventAt = time
    if (gap > STREAM_RESET_MS) this.mode = null

    if (this.mode === null) {
      this.mode =
        discrete || (Math.abs(delta) >= NOTCH_MIN_DELTA && gap >= NOTCH_MIN_GAP_MS)
          ? 'notch'
          : 'smooth'
    } else if (this.mode === 'notch' && !discrete && Math.abs(delta) < NOTCH_MIN_DELTA) {
      // The burst turned continuous — it was a trackpad after all.
      this.mode = 'smooth'
    }

    if (this.mode === 'notch') {
      if (this.lastNotchAt !== 0 && time - this.lastNotchAt < NOTCH_STEP_GAP_MS) {
        return 'ignore'
      }
      this.lastNotchAt = time
      return 'notch'
    }
    return 'stream'
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * The step a gliding position should settle on.
 *
 * `direction` is the sign of the most recent travel: moving forward, any
 * offset past `threshold` belongs to the next step; moving backward is the
 * mirror. With no direction (programmatic), nearest wins. A lower threshold
 * makes the carousel more eager to advance.
 */
export function resolveSnap(
  position: number,
  direction: number,
  threshold: number,
  lastIndex: number,
): number {
  const clamped = clamp(position, 0, lastIndex)
  const base = Math.floor(clamped)
  const offset = clamped - base
  let snapped: number
  if (direction > 0) {
    snapped = offset >= threshold ? base + 1 : base
  } else if (direction < 0) {
    snapped = offset <= 1 - threshold ? base : base + 1
  } else {
    snapped = Math.round(clamped)
  }
  return clamp(snapped, 0, lastIndex)
}
