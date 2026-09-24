import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import type { ProjectContent } from '@/content/types'

/**
 * Bottom centre-left plate: the active project's title (Cinzel caps, large),
 * a "YEAR · medium" meta line, a "View Details" pill, and a subtle "01 / 25"
 * counter for orientation. The title swaps with a mask/clip + fade when the
 * active project changes.
 *
 * Renders the active project from props, so the server markup already carries
 * the first project's title/meta (content-complete without JS).
 */
export default function TitlePlate({
  project,
  index,
  total,
  reducedMotion,
}: {
  project: ProjectContent
  index: number
  total: number
  reducedMotion: boolean
}) {
  const titleRef = useRef<HTMLAnchorElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const firstRun = useRef(true)

  // Animate the swap whenever the slug changes.
  useEffect(() => {
    if (reducedMotion) {
      firstRun.current = false
      return
    }
    if (firstRun.current) {
      firstRun.current = false
      return // don't animate the SSR-matching first paint
    }
    if (!titleRef.current) return
    const tl = gsap.timeline()
    tl.fromTo(
      titleRef.current,
      { yPercent: 18, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
      {
        yPercent: 0,
        opacity: 1,
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.85,
        ease: 'expo.out',
      },
    )
    if (counterRef.current) {
      gsap.fromTo(
        counterRef.current,
        { opacity: 0.2 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
      )
    }
    return () => {
      tl.kill()
    }
  }, [project.slug, reducedMotion])

  const num = String(index + 1).padStart(2, '0')
  const tot = String(total).padStart(2, '0')

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[130]">
      <div
        className="u-container flex flex-col gap-4 pb-[clamp(1.5rem,5vh,3rem)] md:flex-row md:items-end md:justify-between md:gap-10"
      >
        {/* Title block — center-left */}
        <div className="pointer-events-auto max-w-[40rem]">
          <div className="mb-3 flex items-center gap-3">
            <span
              ref={counterRef}
              className="u-eyebrow text-gold"
              aria-label={`Project ${num} of ${tot}`}
            >
              {num}
              <span className="text-faint"> / {tot}</span>
            </span>
            <span aria-hidden="true" className="h-px w-8 bg-line" />
          </div>

          {/* clip wrapper keeps the masked swap tidy */}
          <h2 className="overflow-hidden">
            <a
              ref={titleRef}
              href={`/projects/${project.slug}`}
              className="u-display link-underline inline-block text-[clamp(1.75rem,4.4vw,3.4rem)] leading-[1.02] text-bone"
            >
              {project.title}
            </a>
          </h2>
        </div>

        {/* CTA — bottom right on desktop, below on mobile */}
        <div className="pointer-events-auto shrink-0 pb-1">
          <a
            href={`/projects/${project.slug}`}
            className="btn-line"
            aria-label={`View details of ${project.title}`}
          >
            View Details
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
