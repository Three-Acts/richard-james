/**
 * Central GSAP entry. Import { gsap, ScrollTrigger } from here so ScrollTrigger
 * is registered exactly once, and never on the server (SSG renders without it).
 *
 * The carousel's input plugins — Observer, Draggable and InertiaPlugin — live in
 * lib/carousel/gsapPlugins.ts instead. Keeping them out of this module is what
 * lets a project page load scroll animation without also paying for the ~40 kB
 * of drag/inertia code that only the home stage and the lightbox use.
 *
 * All of these ship free in the public gsap package since 3.13.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

export function registerGsap(): void {
  if (typeof window === 'undefined' || registered) return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

// Register eagerly on the client at import time.
registerGsap()

export { gsap, ScrollTrigger }
