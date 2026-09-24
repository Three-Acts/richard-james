import type { ProjectContent } from "./types"

export type ProjectNavigation = {
  /** Every project, ordered by `sortOrder` ascending. */
  projects: ProjectContent[]
  /** slug -> next project's slug, wrapping past the last project to the first. */
  nextSlugOf: Record<string, string>
  /** slug -> previous project's slug, wrapping past the first project to the last. */
  prevSlugOf: Record<string, string>
}

/**
 * Orders projects by `sortOrder` and derives the wrapping next/previous
 * browsing chain that the source portfolio used to hand-maintain via each
 * project's `next` field (see `data/projects.ts` `previousBySlug`).
 */
export function withNavigation(projects: ProjectContent[]): ProjectNavigation {
  const ordered = [...projects].sort((a, b) => a.sortOrder - b.sortOrder)
  const nextSlugOf: Record<string, string> = {}
  const prevSlugOf: Record<string, string> = {}

  ordered.forEach((project, i) => {
    const next = ordered[(i + 1) % ordered.length]
    const prev = ordered[(i - 1 + ordered.length) % ordered.length]
    nextSlugOf[project.slug] = next.slug
    prevSlugOf[project.slug] = prev.slug
  })

  return { projects: ordered, nextSlugOf, prevSlugOf }
}

/** Unique years across every project, ascending — matches the source's `years` export. */
export function yearsOf(projects: ProjectContent[]): string[] {
  return [...new Set(projects.map((p) => p.year))].filter(Boolean).sort()
}

/** Projects for a given year, or every project when `year` is null. */
export function projectsByYear(projects: ProjectContent[], year: string | null): ProjectContent[] {
  if (!year) return projects
  return projects.filter((p) => p.year === year)
}
