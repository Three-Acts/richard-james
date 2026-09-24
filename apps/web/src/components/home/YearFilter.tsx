import { useMemo } from 'react'
import type { ProjectContent } from '@/content/types'

/**
 * The year navigator.
 *
 * Desktop: a newest-to-oldest vertical list pinned at the left edge. The
 * active year (= the active project's year) is lit gold.
 * Mobile: the same set as a horizontal chip row.
 *
 * Clicking a year jumps to the FIRST project of that year via the supplied
 * goToIndex.
 */
export default function YearFilter({
  projects,
  years,
  activeIndex,
  goToIndex,
  variant = 'rail',
  position = 'absolute',
  footer,
}: {
  projects: ProjectContent[]
  years: string[]
  activeIndex: number
  goToIndex: (i: number) => void
  variant?: 'rail' | 'chips'
  /** Rail only: 'absolute' pins to the stage, 'fixed' to the viewport (the
   *  grid display scrolls the document but keeps the rail in the same spot). */
  position?: 'absolute' | 'fixed'
  /** Rail only: docked beneath the year list — the rail is the home for all
   *  navigation, so the display toggle sits here on desktop. */
  footer?: React.ReactNode
}) {
  // First index in track order for each year — that's the jump target.
  const firstIndexByYear = useMemo(() => {
    const map: Record<string, number> = {}
    projects.forEach((p, i) => {
      if (map[p.year] === undefined) map[p.year] = i
    })
    return map
  }, [projects])

  const activeYear = projects[activeIndex]?.year ?? ''

  const entries: { key: string; label: string; index: number }[] = [...years]
    .sort((a, b) => Number(b) - Number(a))
    .map((y) => ({ key: y, label: y, index: firstIndexByYear[y] ?? 0 }))

  if (variant === 'chips') {
    return (
      <ul
        className="no-scrollbar flex items-center gap-2 overflow-x-auto"
        aria-label="Filter by year"
      >
        {entries.map((e) => {
          const isActive = e.key === activeYear
          return (
            <li key={e.key} className="shrink-0">
              <button
                type="button"
                onClick={() => goToIndex(e.index)}
                aria-current={isActive ? 'true' : undefined}
                className="rounded-full border px-3 py-1.5 font-body text-[0.62rem] uppercase tracking-[0.2em] transition-colors duration-500 ease-out-expo"
                style={{
                  borderColor: isActive
                    ? 'var(--color-gold)'
                    : 'var(--color-line)',
                  color: isActive ? 'var(--color-gold-bright)' : 'var(--color-muted)',
                }}
              >
                {e.label}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  // Vertical rail (desktop).
  return (
    <div
      className={`pointer-events-none ${position} inset-y-0 left-0 z-40 hidden items-center md:flex`}
      style={{ paddingLeft: 'var(--gutter)' }}
    >
      <div className="flex flex-col items-start gap-7">
        <nav aria-label="Filter projects by year">
          <ul className="pointer-events-auto flex flex-col gap-4">
            {entries.map((e) => {
              const isActive = e.key === activeYear
              return (
                <li key={e.key}>
                  <button
                    type="button"
                    onClick={() => goToIndex(e.index)}
                    aria-current={isActive ? 'true' : undefined}
                    className="group relative flex items-center gap-3 font-body text-xs uppercase tracking-[0.28em] outline-none transition-colors duration-500 ease-out-expo focus-visible:text-gold-bright"
                    style={{
                      color: isActive
                        ? 'var(--color-gold-bright)'
                        : 'var(--color-muted)',
                    }}
                  >
                    {/* gold tick that grows for the active year */}
                    <span
                      aria-hidden="true"
                      className="block h-px origin-left bg-current transition-[width,background-color] duration-500 ease-out-expo"
                      style={{
                        width: isActive ? '1.5rem' : '0.5rem',
                        backgroundColor: isActive
                          ? 'var(--color-gold)'
                          : 'var(--color-faint)',
                      }}
                    />
                    <span className="transition-opacity duration-500 group-hover:text-bone">
                      {e.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        {footer && <div className="pointer-events-auto">{footer}</div>}
      </div>
    </div>
  )
}
