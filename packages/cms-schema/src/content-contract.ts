/**
 * Public, read-only content contract served by `apps/api` (`/api/content/*`)
 * and consumed at build time by `apps/web`. Only published records are
 * exposed. Every response uses the standard API envelope
 * `{ ok: true, data } | { ok: false, error: { code, message } }`.
 *
 *   GET /api/content/site             -> SiteContent
 *   GET /api/content/projects         -> ProjectContent[]  (sortOrder asc, images from the project's gallery field, in gallery order)
 *   GET /api/content/projects/:slug   -> ProjectContent
 *   GET /api/content/pages            -> PageContent[]
 *   GET /api/content/pages/:key       -> PageContent
 */

export type SiteContent = {
  name: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  /** `tel:` link, e.g. "tel:+27794273687". */
  phoneHref: string;
  /** Default meta description. */
  description: string;
  /** Absolute URL of the default social image, or "" when unset. */
  ogImage: string;
};

export type ProjectImageContent = {
  /** Absolute public URL. */
  src: string;
  caption?: string;
};

export type ProjectContent = {
  slug: string;
  title: string;
  subtitle?: string;
  originalTitle?: string;
  /** BCP 47 language tag for `originalTitle`, e.g. "fa" or "hi". */
  originalTitleLang?: string;
  year: string;
  medium: string;
  description: string;
  metaDescription: string;
  /** Absolute public URL. */
  hero: string;
  /** Absolute public URL; the API substitutes `hero` when no thumb is set. */
  thumb: string;
  images: ProjectImageContent[];
  /** Show every Nth gallery image in the grid; undefined, 0 or 1 shows all. */
  gridStride?: number;
  /** 1-based position in the browsing order. Next/previous derive from it. */
  sortOrder: number;
};

export type PageContent = {
  /** Route key, e.g. "about" or "essay". */
  key: string;
  title: string;
  /**
   * Lightweight markdown: "# " h1, "## " h2, "### " h3, "- " list item,
   * blank-line-separated paragraphs. See `parsePageBody` in apps/web.
   */
  body: string;
};

export const contentApiPaths = {
  site: () => "/content/site" as const,
  projects: () => "/content/projects" as const,
  project: (slug: string) => `/content/projects/${encodeURIComponent(slug)}` as const,
  pages: () => "/content/pages" as const,
  page: (key: string) => `/content/pages/${encodeURIComponent(key)}` as const
};
