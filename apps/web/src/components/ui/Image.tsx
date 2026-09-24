import { useEffect, useRef, useState } from 'react'

export interface ImageProps {
  src: string
  alt: string
  className?: string
  /** Load eagerly + high priority (e.g. hero / above-the-fold). */
  priority?: boolean
  /**
   * Optional wrapper aspect ratio. Accepts a CSS string ("3/4") or a number
   * (0.75). Omit for natural / "free form" sizing — the image keeps its own
   * intrinsic ratio.
   */
  aspectRatio?: string | number
  /** Passed to the underlying <img> for responsive selection. */
  sizes?: string
  draggable?: boolean
  /** Forwarded after the internal fade-in bookkeeping has run. */
  onLoad?: () => void
}

/**
 * A quietly elegant image: object-cover, fades + lifts a hair from a soft
 * blur as it decodes. SSR-safe — renders a normal <img> in markup (real
 * content, crawlable) and only layers the reveal once mounted on the client.
 * Cached images (img.complete) resolve instantly so nothing is left hidden.
 */
export default function Image({
  src,
  alt,
  className,
  priority = false,
  aspectRatio,
  sizes,
  draggable = false,
  onLoad,
}: ImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  const markLoaded = () => {
    setLoaded(true)
    onLoad?.()
  }

  // Catch images that were already complete before React attached the handler
  // (browser cache / SSR hydration), so they never stay stuck at opacity 0.
  useEffect(() => {
    const node = imgRef.current
    if (node && node.complete && node.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  const wrapperStyle =
    aspectRatio !== undefined
      ? { aspectRatio: typeof aspectRatio === 'number' ? String(aspectRatio) : aspectRatio }
      : undefined

  return (
    <span
      className={`relative block overflow-hidden ${className ?? ''}`}
      style={wrapperStyle}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // React types lag the DOM attribute; lower-case form is valid HTML.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ fetchpriority: priority ? 'high' : 'auto' } as any)}
        draggable={draggable}
        onLoad={markLoaded}
        className="h-full w-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'scale(1)' : 'scale(1.04)',
          transition:
            'opacity 0.8s var(--ease-out-expo), transform 0.9s var(--ease-out-expo), filter 0.8s var(--ease-out-expo)',
          filter: loaded ? 'blur(0)' : 'blur(12px)',
          willChange: loaded ? 'auto' : 'opacity, transform, filter',
        }}
      />
    </span>
  )
}
