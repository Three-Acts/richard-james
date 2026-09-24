import { useEffect, useRef } from 'react'
import Image from '@/components/ui/Image'
import type { ProjectContent } from '@/content/types'
import type { CarouselApi } from '@/lib/carousel/useCarousel'

/**
 * The thumbnail rail.
 *
 * Desktop (md+): a vertical column pinned at the far right. It translateY's
 * continuously from scroll progress so the active thumb stays vertically
 * centred; the active thumb is enlarged + lit with a gold hairline ring, the
 * rest dimmed & slightly smaller. Clicking selects (goToIndex).
 *
 * Mobile: rendered separately by HomeExperience as a horizontal scroll-snap
 * strip — see MobileTrack below.
 */

const THUMB_H = 72 // px, dormant thumbnail height (incl. gap step)
const GAP = 14
const STEP = THUMB_H + GAP

export default function VerticalTrack({
  projects,
  activeIndex,
  api,
}: {
  projects: ProjectContent[]
  activeIndex: number
  api: CarouselApi
}) {
  const { goToIndex, reducedMotion, registerFrame } = api
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<HTMLLIElement[]>([])
  const setItem = (i: number) => (el: HTMLLIElement | null) => {
    if (el) itemRefs.current[i] = el
  }

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const N = projects.length
    const lastN = Math.max(N - 1, 1)

    const apply = (progress: number) => {
      const pos = reducedMotion ? Math.round(progress * lastN) : progress * lastN
      // Translate the whole list so the active (fractional) item is centred.
      const ty = -pos * STEP
      list.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`

      for (let i = 0; i < N; i++) {
        const item = itemRefs.current[i]
        if (!item) continue
        const d = Math.abs(i - pos)
        const lit = Math.max(0, 1 - d) // 1 at active → 0 one step away
        const scale = 0.82 + 0.18 * lit
        const opacity = 0.3 + 0.7 * lit
        item.style.transform = `scale(${scale.toFixed(4)})`
        item.style.opacity = opacity.toFixed(3)
        const ring = item.firstElementChild as HTMLElement | null
        if (ring) ring.style.setProperty('--ring', lit.toFixed(3))
      }
    }

    const unsub = registerFrame((progress) => apply(progress))
    return unsub
  }, [projects.length, reducedMotion, registerFrame])

  return (
    <nav
      aria-label="Project thumbnails"
      className="pointer-events-none absolute inset-y-0 right-0 z-40 hidden w-[clamp(5.5rem,8vw,7rem)] items-center md:flex"
      style={{ paddingRight: 'clamp(1rem,2vw,2rem)' }}
    >
      {/* center mask so thumbs fade at the top/bottom of the column */}
      <div
        className="relative h-[60vh] w-full overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)',
        }}
      >
        <ul
          ref={listRef}
          className="pointer-events-auto absolute left-0 right-0 top-1/2 flex flex-col items-center will-change-transform"
          style={{ gap: `${GAP}px`, marginTop: `-${THUMB_H / 2}px` }}
        >
          {projects.map((p, i) => (
            <li
              key={p.slug}
              ref={setItem(i)}
              className="shrink-0 will-change-transform"
              style={{
                height: `${THUMB_H}px`,
                width: `${THUMB_H}px`,
                opacity: i === 0 ? 1 : 0.3,
                transform: i === 0 ? 'scale(1)' : 'scale(0.82)',
                transition: reducedMotion ? 'none' : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => goToIndex(i)}
                aria-label={`${p.title}, ${p.year}`}
                aria-current={i === activeIndex ? 'true' : undefined}
                tabIndex={i === activeIndex ? 0 : -1}
                className="group relative block h-full w-full overflow-hidden rounded-[2px] outline-none"
                style={
                  {
                    // --ring drives the gold hairline + glow (set per-frame).
                    ['--ring' as string]: i === 0 ? '1' : '0',
                  } as React.CSSProperties
                }
              >
                <Image
                  src={p.thumb}
                  alt={p.title}
                  aspectRatio="1/1"
                  sizes="7rem"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
                {/* gold hairline ring — opacity tied to --ring */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[2px]"
                  style={{
                    boxShadow:
                      'inset 0 0 0 1px color-mix(in srgb, var(--color-gold) calc(var(--ring,0) * 100%), transparent)',
                  }}
                />
                {/* keyboard focus ring */}
                <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-transparent transition group-focus-visible:ring-gold-bright" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/**
 * Mobile horizontal strip: scroll-snap thumbnails, the centred one is active.
 * An IntersectionObserver reports the centred item back to the experience.
 */
export function MobileTrack({
  projects,
  activeIndex,
  onSelect,
}: {
  projects: ProjectContent[]
  activeIndex: number
  onSelect: (i: number) => void
}) {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<HTMLLIElement[]>([])
  const setItem = (i: number) => (el: HTMLLIElement | null) => {
    if (el) itemRefs.current[i] = el
  }
  const lastReported = useRef(activeIndex)

  // Observe which thumb is centred and report it up (throttled by IO itself).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const io = new IntersectionObserver(
      (entries) => {
        let best: { i: number; ratio: number } | null = null
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.idx)
          if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio)) {
            best = { i, ratio: e.intersectionRatio }
          }
        }
        if (best && best.i !== lastReported.current) {
          lastReported.current = best.i
          onSelect(best.i)
        }
      },
      { root: scroller, threshold: [0.5, 0.75, 1], rootMargin: '0px -42% 0px -42%' },
    )
    itemRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [onSelect, projects.length])

  // When the active index changes from outside (e.g. year chip), centre it.
  useEffect(() => {
    if (activeIndex === lastReported.current) return
    lastReported.current = activeIndex
    const el = itemRefs.current[activeIndex]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  return (
    <ul
      ref={scrollerRef}
      data-lenis-prevent-horizontal
      className="no-scrollbar flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[42%] py-1"
      aria-label="Project thumbnails"
    >
      {projects.map((p, i) => (
        <li
          key={p.slug}
          ref={setItem(i)}
          data-idx={i}
          className="shrink-0 snap-center"
        >
          <button
            type="button"
            onClick={() => {
              onSelect(i)
              itemRefs.current[i]?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
              })
            }}
            aria-label={`${p.title}, ${p.year}`}
            aria-current={i === activeIndex ? 'true' : undefined}
            className="group relative block h-14 w-14 overflow-hidden rounded-[2px] outline-none transition-[transform,opacity] duration-500 ease-out-expo"
            style={{
              opacity: i === activeIndex ? 1 : 0.4,
              transform: i === activeIndex ? 'scale(1)' : 'scale(0.86)',
            }}
          >
            <Image
              src={p.thumb}
              alt={p.title}
              aspectRatio="1/1"
              sizes="3.5rem"
              draggable={false}
              className="h-full w-full object-cover"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2px]"
              style={{
                boxShadow:
                  i === activeIndex ? 'inset 0 0 0 1px var(--color-gold)' : 'none',
              }}
            />
            <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-transparent transition group-focus-visible:ring-gold-bright" />
          </button>
        </li>
      ))}
    </ul>
  )
}
