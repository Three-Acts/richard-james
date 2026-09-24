import type { PageContent, ProjectContent, SiteContent } from "@three-acts/cms-schema"

export type { SiteContent, ProjectContent, ProjectImageContent, PageContent, SeoContent } from "@three-acts/cms-schema"

/**
 * Read-only content backend for the site. `apps/web` reads through this
 * interface at build/dev time; `api-source.ts` (see `./index.ts`) is the only
 * implementation — there is no local content fallback — so pages and islands
 * never talk to the HTTP endpoint directly.
 */
export type ContentSource = {
  /** Human-readable source name, surfaced in build logs. */
  readonly name: string
  getSite(): Promise<SiteContent>
  listProjects(): Promise<ProjectContent[]>
  getProject(slug: string): Promise<ProjectContent | null>
  getPage(slug: string): Promise<PageContent | null>
}

/**
 * `SiteContent` plus the synchronous site origin from astro.config.mjs
 * (`import.meta.env.SITE`, see `@/data/site`), which isn't part of the
 * content contract itself. Base.astro assembles this once per page render and
 * passes it down to Seo/Nav/Menu/Footer/Preloader and the JSON-LD builders.
 */
export type SiteWithUrl = SiteContent & { url: string }
