import Lenis from 'lenis'

/**
 * The single shared Lenis instance.
 *
 * Deliberately free of any GSAP import. Smooth scrolling is wanted on every
 * page, but GSAP is ~154 kB and only the project pages and the home stage
 * animate — importing it here would put the whole of GSAP on the essay and about
 * pages for the sake of one ScrollTrigger.update call. Pages that do animate
 * take the RAF loop over via lib/scrollSync.ts.
 *
 * The instance is parked on `window` rather than in module scope on purpose: the
 * site's client code is split across the layout's shell script and several React
 * islands, which Rollup may emit as separate chunks. A module-level binding
 * could therefore exist more than once; `window` guarantees every caller — Menu,
 * Preloader, Lightbox — reaches the same Lenis.
 */
declare global {
  interface Window {
    __rjLenis?: Lenis | null
    __rjLenisRaf?: number
  }
}

export function getLenis(): Lenis | null {
  if (typeof window === 'undefined') return null
  return window.__rjLenis ?? null
}

/**
 * Create the shared instance, driven by its own RAF loop. Safe to call more than
 * once — subsequent calls are no-ops. Honours prefers-reduced-motion by leaving
 * native scrolling alone.
 */
export function initSmoothScroll(): void {
  if (typeof window === 'undefined') return
  if (window.__rjLenis) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const instance = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    smoothWheel: true,
    // Touch devices keep native momentum scrolling.
    syncTouch: false,
  })
  window.__rjLenis = instance

  const raf = (time: number) => {
    instance.raf(time)
    window.__rjLenisRaf = window.requestAnimationFrame(raf)
  }
  window.__rjLenisRaf = window.requestAnimationFrame(raf)
}

/**
 * Stop driving Lenis from the standalone loop, so a caller can drive it instead.
 * Used by lib/scrollSync.ts to hand ticking over to the GSAP ticker, which keeps
 * Lenis and ScrollTrigger on one shared frame — necessary for scrubbed
 * animations not to judder against the smoothed scroll position.
 */
export function releaseRaf(): void {
  if (typeof window === 'undefined') return
  if (window.__rjLenisRaf === undefined) return
  window.cancelAnimationFrame(window.__rjLenisRaf)
  window.__rjLenisRaf = undefined
}
