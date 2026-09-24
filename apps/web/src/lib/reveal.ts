/**
 * Scroll-reveal for static markup — the framework-free replacement for the old
 * <Reveal> React component.
 *
 * The hidden start-state lives in CSS (see global.css) behind the `[data-js]`
 * flag that the layout sets before first paint, so it applies with no flash for
 * JS visitors and never hides anything from crawlers or no-JS visitors. All this
 * module does is flip `data-reveal-visible` when an element scrolls into view.
 *
 * Per-element tuning comes from the markup:
 *   data-reveal              mark an element as revealable
 *   data-reveal-delay="0.12" seconds before the transition starts
 *   data-reveal-y="32"       pixels the content lifts from
 *   data-reveal-repeat       re-hide when it leaves view (default: reveal once)
 */

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        if (entry.isIntersecting) {
          el.setAttribute('data-reveal-visible', '')
          if (!el.hasAttribute('data-reveal-repeat')) observer?.unobserve(el)
        } else if (el.hasAttribute('data-reveal-repeat')) {
          el.removeAttribute('data-reveal-visible')
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
  )
  return observer
}

/**
 * Wire a single element. Exported so React islands can opt in too — their DOM
 * mounts after initReveal() has already swept the page, so they would otherwise
 * never be observed (and would sit at opacity 0 forever). See
 * components/ui/Reveal.tsx.
 */
export function observeReveal(node: HTMLElement): void {
  if (typeof window === 'undefined') return
  if (node.hasAttribute('data-reveal-bound')) return

  node.setAttribute('data-reveal-bound', '')

  // Reduced motion (or a browser without IO): show instantly, no transition.
  if (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !('IntersectionObserver' in window)
  ) {
    node.setAttribute('data-reveal-visible', '')
    return
  }

  getObserver().observe(node)
}

/**
 * Observe every not-yet-wired `[data-reveal]` under `root`. Idempotent, so it
 * can run on first load and again after each ClientRouter navigation.
 */
export function initReveal(root: ParentNode = document): void {
  if (typeof window === 'undefined') return

  for (const node of root.querySelectorAll<HTMLElement>(
    '[data-reveal]:not([data-reveal-bound])',
  )) {
    observeReveal(node)
  }
}
