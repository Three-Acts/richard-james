import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectContent } from '@/content/types'
import Image from '@/components/ui/Image'
import Reveal from '@/components/ui/Reveal'
import { getLenis } from '@/lib/lenis'
import YearFilter from './YearFilter'

function ProjectCard({ project, index }: { project: ProjectContent; index: number }) {
  return (
    <Reveal
      // Cap the stagger so rows further down the page still feel lively.
      delay={Math.min(index % 6, 5) * 0.06}
      className="group"
    >
      <a
        href={`/projects/${project.slug}`}
        className="block focus-visible:outline-none"
        aria-label={`${project.title}, ${project.year}`}
      >
        <div className="relative overflow-hidden bg-ink-soft">
          <Image
            src={project.thumb}
            alt={project.title}
            aspectRatio="4/5"
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="h-full w-full transition-transform duration-[1.2s] ease-out-expo will-change-transform group-hover:scale-[1.04]"
          />
          {/* Gold hairline that draws in on hover. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-700 ease-out-expo group-hover:border-gold/40"
          />
        </div>

        {/* Grid keeps it spare — just the title + year, no medium/materials. */}
        <div className="mt-5 flex items-baseline justify-between gap-4">
          <h2 className="u-display text-balance text-base leading-tight text-bone transition-colors duration-500 ease-out-expo group-hover:text-gold-bright sm:text-lg">
            {project.title}
          </h2>
          <span className="u-eyebrow shrink-0 -translate-y-px text-faint transition-colors duration-500 ease-out-expo group-hover:text-gold">
            {project.year}
          </span>
        </div>
      </a>
    </Reveal>
  )
}

/**
 * The "Grid" display of the home experience — every work, newest first, as a
 * normally-scrolling grid. Deliberately no header or tab row of its own: the
 * chrome is shared with the slideshow, so swapping views shifts as little as
 * possible. The desktop year rail lives at the top level (HomeExperience) and
 * navigates this via the reported goToIndex: clicking a year scrolls to that
 * year's first work, and the lit year tracks the cards under the reading band
 * as you scroll (reported up through onNav). Below md the rail is hidden and a
 * year chip row stands in.
 */
const navHeight = () =>
  document.querySelector('header')?.getBoundingClientRect().height ?? 80

export default function ProjectsGrid({
  projects,
  years,
  onNav,
}: {
  projects: ProjectContent[]
  years: string[]
  /** Report the active work + navigator up to the persistent year rail. */
  onNav?: (nav: {
    activeIndex: number
    goToIndex: (i: number) => void
    reset?: () => void
  }) => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const setItem = (i: number) => (el: HTMLLIElement | null) => {
    itemRefs.current[i] = el
  }

  // Index of each year's first card, in track order (newest first).
  const yearStarts = useMemo(() => {
    const seen = new Set<string>()
    const starts: number[] = []
    projects.forEach((p, i) => {
      if (!seen.has(p.year)) {
        seen.add(p.year)
        starts.push(i)
      }
    })
    return starts
  }, [projects])

  // After a rail click, the chosen year holds until the visitor scrolls
  // again themselves: two years can start on the same grid row (… 1995 |
  // 1994), and the spy alone cannot tell which of them was meant.
  const holdRef = useRef(false)

  // Scroll-spy. Grid rows can mix years (… 1996 | 1995 | 1994 …), so "which
  // card is in view" is ambiguous; "which year have we scrolled into" is not:
  // the lit year is the LAST one whose first card has crossed a reading line
  // just under the nav.
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      if (holdRef.current) return
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8
      if (atBottom) {
        // The last year's first card may not be able to reach the line.
        setActiveIndex(projects.length - 1)
        return
      }
      const line = navHeight() + 40
      let active = yearStarts[0] ?? 0
      for (const i of yearStarts) {
        const el = itemRefs.current[i]
        if (!el) continue
        if (el.getBoundingClientRect().top <= line) active = i
        else break
      }
      setActiveIndex(active)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    // Real input (as opposed to the click-glide's programmatic scrolling)
    // releases a held year and hands the rail back to the spy.
    const release = () => {
      holdRef.current = false
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('keydown', release)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('keydown', release)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [yearStarts])

  // Stable so the onNav report (below) doesn't fire on every render.
  const goToIndex = useCallback((i: number) => {
    const el = itemRefs.current[i]
    if (!el) return
    // The chosen year lights at once and holds through (and after) the glide.
    holdRef.current = true
    setActiveIndex(i)
    // Land the card just below the fixed nav — on the reading line, so the
    // spy settles on exactly this year.
    const offset = -(navHeight() + 24)
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(el, { offset })
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
  }, [])

  // The Home-link-while-on-home gesture: glide the grid back to the very top.
  // The scroll spy re-lights the years on the way up, so no state to touch.
  const reset = useCallback(() => {
    holdRef.current = false
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Feed the persistent (outside-the-fade) year rail — the lit year tracks the
  // scroll spy, and clicking a year jumps the grid.
  useEffect(() => {
    onNav?.({ activeIndex, goToIndex, reset })
  }, [activeIndex, goToIndex, onNav, reset])

  return (
    <section
      aria-label="All works"
      className="u-container pb-32 pt-5 md:pl-[clamp(6.5rem,10vw,9rem)] md:pt-[clamp(2rem,5vh,3.25rem)]"
    >
      {/* Mobile: chip row standing in for the (desktop-only) rail. */}
      <div className="mb-8 md:hidden">
        <YearFilter
          projects={projects}
          years={years}
          activeIndex={activeIndex}
          goToIndex={goToIndex}
          variant="chips"
        />
      </div>

      <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
        {projects.map((p, i) => (
          <li key={p.slug} ref={setItem(i)} data-idx={i}>
            <ProjectCard project={p} index={i} />
          </li>
        ))}
      </ul>
    </section>
  )
}
