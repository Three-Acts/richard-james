import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { observeReveal } from '@/lib/reveal'

export interface RevealProps {
  /** Element type to render (default 'div'). */
  as?: ElementType
  className?: string
  /** Delay before the reveal transition, in seconds. */
  delay?: number
  /** Distance (px) the content lifts from. */
  y?: number
  /** Reveal only the first time it enters view (default true). */
  once?: boolean
  children?: ReactNode
}

/**
 * Fades + lifts its children when scrolled into view — the React island
 * counterpart of components/ui/Reveal.astro.
 *
 * Both render identical markup and share one IntersectionObserver and one set of
 * CSS transitions (see src/lib/reveal.ts and the [data-reveal] rules in
 * global.css). The only reason this file exists is that an island's DOM appears
 * after the page-level sweep has run, so it has to register itself on mount.
 */
export default function Reveal({
  as,
  className,
  delay = 0,
  y = 24,
  once = true,
  children,
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (ref.current) observeReveal(ref.current)
  }, [])

  // Only emit the custom properties that differ from the CSS defaults.
  const style: CSSProperties = {}
  if (delay) (style as Record<string, string>)['--reveal-delay'] = `${delay}s`
  if (y !== 24) (style as Record<string, string>)['--reveal-y'] = `${y}px`

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal=""
      data-reveal-repeat={once ? undefined : ''}
      style={style}
    >
      {children}
    </Tag>
  )
}
