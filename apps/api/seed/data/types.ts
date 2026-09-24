/**
 * A single gallery image with an optional short write-up. The write-up shows
 * as a caption beneath the image in the grid; it is NOT shown in the fullscreen
 * viewer (there we just show the artwork).
 */
export interface GalleryImage {
  /** Image path, e.g. "/images/<slug>/02.avif" — matched against a file under apps/api/seed/images/. */
  src: string
  /** Optional short write-up / caption for this image. */
  caption?: string
}

/**
 * A gallery entry is either a bare image path (no write-up) or a
 * `{ src, caption }` object. The bare-string form keeps data terse for the many
 * images that don't need a caption; use the object form to attach one. Run every
 * entry through `galleryImages()` (see data/projects.ts) to normalise to
 * `GalleryImage[]` before seeding.
 */
export type GalleryEntry = string | GalleryImage

export interface Project {
  /** URL slug, e.g. "ghosts-become-ancestors" */
  slug: string
  /** Display title, e.g. "Ghosts Become Ancestors" */
  title: string
  /** Optional translated/transliterated subtitle. */
  subtitle?: string
  /** Optional title in its original writing system. */
  originalTitle?: string
  /** BCP 47 language tag for `originalTitle`, e.g. "fa" or "hi". */
  originalTitleLang?: string
  /** Year of work, e.g. "2025" */
  year: string
  /** Materials & dimensions line */
  medium: string
  /** Body / "slide text" describing the work */
  description: string
  /** Trimmed description for <meta> tags */
  metaDescription: string
  /** Hero image path, e.g. "/images/<slug>/01.avif" */
  hero: string
  /** Thumbnail image path */
  thumb: string
  /**
   * All gallery images in order. Each entry is a bare path or a
   * `{ src, caption }` object — normalise with `galleryImages(project)`.
   */
  images: GalleryEntry[]
  /**
   * Show only every Nth image in the gallery grid, starting with the first.
   * Every image stays in the fullscreen viewer, so the hidden ones are still
   * reachable by swiping — use this for works documented in near-identical
   * runs, where the grid should carry one representative per piece rather than
   * every frame. Omit (or 1) to show them all.
   */
  gridStride?: number
  /** Slug of the next project (wraps around) — informational only; the
   *  seeded `sortOrder` (this project's 1-based array index) is what actually
   *  drives next/previous in the API's content contract. */
  next: string
}

/** A single block of long-form content (about / essay). */
export interface ContentBlock {
  /** Original semantic tag: h1 | h2 | h3 | p | li */
  tag: string
  text: string
}
