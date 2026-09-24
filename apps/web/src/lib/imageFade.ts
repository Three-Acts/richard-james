/**
 * The decode-in fade for static <img data-img-fade> markup — the framework-free
 * half of the old <Image> React component.
 *
 * As with the reveal, the blurred start-state lives in CSS behind `[data-js]`,
 * so no-JS visitors see the artwork immediately. (The React component this
 * replaces set `opacity: 0` inline during SSR, which left every image invisible
 * without JavaScript.) Here we only mark images `data-loaded`.
 */

function markLoaded(img: HTMLImageElement): void {
  img.setAttribute('data-loaded', '')
}

/**
 * Wire every not-yet-bound faded image under `root`. Idempotent — safe on first
 * load and after each ClientRouter navigation.
 */
export function initImageFade(root: ParentNode = document): void {
  if (typeof window === 'undefined') return

  const images = root.querySelectorAll<HTMLImageElement>(
    'img[data-img-fade]:not([data-img-bound])',
  )

  for (const img of images) {
    img.setAttribute('data-img-bound', '')

    // Already decoded before this ran (browser cache, or a priority image that
    // beat the script) — reveal it now so it can never stay stuck at opacity 0.
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img)
      continue
    }

    img.addEventListener('load', () => markLoaded(img), { once: true })
    // A broken image should not leave a blurred hole in the layout.
    img.addEventListener('error', () => markLoaded(img), { once: true })
  }
}
