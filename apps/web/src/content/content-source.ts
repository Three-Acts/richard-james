/**
 * Build-time content contract for the public web app.
 *
 * The web app is static-first: content is fetched from a `ContentSource` during
 * `pnpm build:web` (and during SSR dev) and baked into HTML. In dev the same
 * source powers live rendering, so editors see fresh data; at build the result
 * is frozen into static files.
 *
 * This mirrors the CMS `CmsDataAdapter` pattern (see
 * `apps/cms/src/cms/types.ts`) so the two apps stay conceptually aligned: the
 * CMS writes records, the web app reads a published projection of them.
 */

export type ContentEntry = {
  /** URL-safe identifier used to build the route path. */
  slug: string;
  title: string;
  excerpt: string;
  /** Plain text / lightweight markup rendered into the page body. */
  body: string;
  /** Optional local (public/) or external cover image. */
  coverImage?: string;
  /** ISO timestamp; drives sitemap `lastmod` and ordering. */
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
};

export type ContentSource = {
  /** Human-readable source name, surfaced in build logs. */
  readonly name: string;
  /** Published posts, newest first. */
  listPosts(): Promise<ContentEntry[]>;
  getPost(slug: string): Promise<ContentEntry | null>;
};
