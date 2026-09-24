/**
 * Run a piece of setup once per *page*, under Astro's ClientRouter.
 *
 * Astro bundles component `<script>` tags into ES modules, so their top level
 * executes exactly once for the whole session — a module the browser has already
 * evaluated is not re-run after a client-side navigation. Anything that has to
 * bind to the freshly-swapped DOM therefore belongs in an `astro:page-load`
 * handler, and anything bound outside that DOM (window/document listeners, GSAP
 * instances) has to be released on `astro:before-swap` or it accumulates one
 * copy per navigation.
 *
 * Call this at the top level of a component script:
 *
 *   onEachPage(() => {
 *     const el = document.querySelector('#thing')
 *     if (!el) return
 *     window.addEventListener('scroll', onScroll)
 *     return () => window.removeEventListener('scroll', onScroll)
 *   })
 */
export function onEachPage(setup: () => void | (() => void)): void {
  if (typeof document === 'undefined') return

  let cleanup: (() => void) | undefined

  const run = () => {
    const result = setup()
    cleanup = typeof result === 'function' ? result : undefined
  }

  const teardown = () => {
    cleanup?.()
    cleanup = undefined
  }

  // Fires on the initial load as well as after every ClientRouter navigation.
  document.addEventListener('astro:page-load', run)
  document.addEventListener('astro:before-swap', teardown)
}
