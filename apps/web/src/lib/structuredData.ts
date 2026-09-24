/**
 * JSON-LD builders — pure, side-effect-free helpers that return plain schema.org
 * objects. Pages pass these to <Seo jsonLd={...} />, which serialises them into
 * the pre-rendered <head>.
 *
 * Everything is typed as Record<string, unknown> so it slots straight into the
 * Seo `jsonLd` prop. `site` carries the resolved content-source site plus the
 * synchronous `url` from astro.config.mjs (see `@/content/types` `SiteWithUrl`);
 * every URL is absolutised against `site.url`. Project-dependent builders take
 * their project data as plain parameters rather than importing `@/data/projects`
 * directly, so they work the same whether that data came from the local files
 * or the API.
 */
import type { ProjectContent, SiteWithUrl } from "@/content/types"

export type { SiteWithUrl } from "@/content/types"

type JsonLd = Record<string, unknown>

/**
 * Join site.url with a root-absolute path, collapsing any double slash.
 * `path` may already be absolute (e.g. a bucket URL from the API content
 * source) — in that case it's returned as-is. Shared with Seo.astro, which
 * needs the same guard for its og:image / twitter:image.
 */
export function abs(site: SiteWithUrl, path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}

/** JSON-LD for the whole site / a page that represents the artist. */
export function personJsonLd(site: SiteWithUrl): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: 'Artist',
    nationality: [
      { '@type': 'Country', name: 'South Africa' },
      { '@type': 'Country', name: 'United Kingdom' },
    ],
    url: site.url,
    email: `mailto:${site.email}`,
    telephone: site.phone,
    address: { '@type': 'PostalAddress', addressLocality: 'Gqeberha', addressCountry: 'ZA' },
  }
}

/** JSON-LD for a single artwork/project. */
export function artworkJsonLd(
  p: {
    title: string
    description: string
    image: string
    medium: string
    year: string
    slug: string
  },
  site: SiteWithUrl,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: p.title,
    creator: { '@type': 'Person', name: site.name },
    artMedium: p.medium,
    dateCreated: p.year,
    description: p.description,
    image: abs(site, p.image),
    url: abs(site, `/projects/${p.slug}`),
  }
}

/** Article node for long-form writing (the essay page). */
export function articleJsonLd(
  a: {
    headline: string
    description: string
    path: string
    keywords?: string[]
  },
  site: SiteWithUrl,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    url: abs(site, a.path),
    mainEntityOfPage: abs(site, a.path),
    inLanguage: 'en',
    author: { '@type': 'Person', name: site.name, url: site.url },
    publisher: { '@type': 'Person', name: site.name, url: site.url },
    ...(a.keywords ? { keywords: a.keywords.join(', ') } : {}),
  }
}

/**
 * Site-level WebSite node. Identifies the canonical origin and publisher.
 */
export function websiteJsonLd(site: SiteWithUrl): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    alternateName: site.tagline,
    url: site.url,
    logo: `${site.url}/favicon.svg`,
    sameAs: ['https://richard-james-art.vercel.app/'],
    description: site.description,
    inLanguage: 'en',
    publisher: {
      '@type': 'Person',
      name: site.name,
      url: site.url,
    },
  }
}

/**
 * BreadcrumbList for the current page. Pass an ordered trail of crumbs from the
 * site root to the active page, e.g.
 *   breadcrumbJsonLd([
 *     { name: 'Home', path: '/' },
 *     { name: 'Projects', path: '/projects' },
 *     { name: 'Loss', path: '/projects/loss' },
 *   ], site)
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[], site: SiteWithUrl): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(site, item.path),
    })),
  }
}

/**
 * ImageGallery node for a single project page — describes the work as a
 * collection of images attributed to the artist. Complements artworkJsonLd
 * (VisualArtwork) by enumerating every associated image.
 */
export function imageGalleryJsonLd(
  p: {
    title: string
    images: string[]
    slug: string
    description?: string
  },
  site: SiteWithUrl,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: p.title,
    url: abs(site, `/projects/${p.slug}`),
    ...(p.description ? { description: p.description } : {}),
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    author: { '@type': 'Person', name: site.name, url: site.url },
    associatedMedia: p.images.map((src, i) => ({
      '@type': 'ImageObject',
      contentUrl: abs(site, src),
      name: `${p.title} — ${i + 1}`,
    })),
  }
}

/**
 * CollectionPage for the home page, which hosts the full works grid (the
 * standalone /projects index was folded into it). Lists every project as a
 * VisualArtwork so the full body of work is discoverable from one node.
 */
export function collectionJsonLd(projects: ProjectContent[], site: SiteWithUrl): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${site.name} — Works`,
    url: abs(site, '/'),
    description: site.description,
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    author: { '@type': 'Person', name: site.name, url: site.url },
    hasPart: {
      '@type': 'ItemList',
      numberOfItems: projects.length,
      itemListElement: projects.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(site, `/projects/${p.slug}`),
        item: {
          '@type': 'VisualArtwork',
          name: p.title,
          url: abs(site, `/projects/${p.slug}`),
          image: abs(site, p.thumb),
          artMedium: p.medium,
          dateCreated: p.year,
          creator: { '@type': 'Person', name: site.name },
        },
      })),
    },
  }
}
