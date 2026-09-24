/**
 * The app shell, loaded once from the base layout.
 *
 * This is what the old <Layout> React component did — one shared Lenis, scroll
 * reset on navigation, scroll-reveal and image fades — minus React. It runs
 * exactly once per full page load; the per-navigation work hangs off Astro's
 * ClientRouter lifecycle events.
 *
 * Note what is *not* here: GSAP. Only pages that animate import it (see
 * lib/scrollSync.ts), which keeps it off the reading pages entirely.
 */
import { getLenis, initSmoothScroll } from '@/lib/lenis'
import { initReveal } from '@/lib/reveal'
import { initImageFade } from '@/lib/imageFade'

initSmoothScroll()

/**
 * Wire the freshly-swapped DOM. Fires on the initial load too, so this is the
 * single place where per-page enhancement gets kicked off.
 */
document.addEventListener('astro:page-load', () => {
  initReveal()
  initImageFade()
  // The new page is a different height, and Lenis caches that.
  getLenis()?.resize()
})

/**
 * ClientRouter moves the native scroll position itself, but Lenis keeps its own
 * animated position and would otherwise glide the new page back to wherever the
 * old one was. Snap it to match, without a transition.
 */
document.addEventListener('astro:after-swap', () => {
  const lenis = getLenis()
  if (!lenis) return
  lenis.scrollTo(window.scrollY, { immediate: true, force: true })
  lenis.resize()
})
