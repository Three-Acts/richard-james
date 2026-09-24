/**
 * Joins Lenis and ScrollTrigger onto one frame, and manages ScrollTrigger's
 * lifecycle across ClientRouter navigations.
 *
 * Imported only by the things that actually animate on scroll — the project
 * hero, the next-project panel, the home stage — so pages made purely of type
 * never load GSAP at all. Once any page has pulled it in, the module stays in
 * the browser's cache and keeps driving Lenis for the rest of the session; the
 * wiring below is idempotent and safe to call from every one of them.
 */
import { gsap, ScrollTrigger } from './gsap'
import { getLenis, releaseRaf } from './lenis'

declare global {
  interface Window {
    __rjScrollSync?: boolean
  }
}

export function initScrollSync(): void {
  if (typeof window === 'undefined') return
  if (window.__rjScrollSync) return
  window.__rjScrollSync = true

  const lenis = getLenis()
  if (lenis) {
    // Take the RAF loop off Lenis's own timer and onto the GSAP ticker, so the
    // smoothed scroll position and every scrubbed tween advance together.
    releaseRaf()
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  // The incoming page is a different height, and its own animations register on
  // astro:page-load — refresh after both.
  document.addEventListener('astro:page-load', () => {
    ScrollTrigger.refresh()
  })

  /**
   * Every ScrollTrigger on the outgoing page dies with it. Page-level animations
   * re-create theirs on the next astro:page-load, so clearing the whole set here
   * is both safe and necessary — otherwise each navigation leaves a generation
   * of dead triggers behind.
   */
  document.addEventListener('astro:before-swap', () => {
    for (const trigger of ScrollTrigger.getAll()) trigger.kill()
  })
}
