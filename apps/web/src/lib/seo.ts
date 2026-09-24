import { site, type SeoMetadata } from "../site";

/** Escape a JSON-LD payload so it cannot break out of the <script> element. */
export function escapeJsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function absolute(pathOrUrl: string, base: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, base).toString();
}

export type ResolvedSeo = {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: "website" | "article";
  robots: string;
  keywords?: string;
  /** Serialized (escaped) JSON-LD `@graph` payload for a <script type="application/ld+json">. */
  jsonLd: string;
};

/**
 * Resolves a route's SEO metadata into the concrete values the layout renders:
 * title, description, canonical, robots, Open Graph/Twitter image, and JSON-LD
 * structured data (Organization + WebSite site-wide, plus WebPage/Article per
 * page).
 *
 * Structured data doubles as AEO (answer-engine optimization): AI search
 * crawlers read JSON-LD to understand and cite pages.
 */
export function resolveSeo(seo: SeoMetadata): ResolvedSeo {
  const canonical = absolute(seo.canonicalPath, site.url);
  const image = absolute(seo.image ?? site.defaultImage, site.url);
  const type = seo.type ?? "website";
  const robots = seo.noindex ? "noindex,nofollow" : "index,follow";

  // Generic per-page node (WebPage, or Article when no more specific entity is
  // supplied). When `seo.structuredData` provides a primary entity of its own
  // (e.g. a blog post's BlogPosting), merge these shared fields into it
  // instead of also emitting this node — otherwise a blog post ends up with
  // both an `Article` and a `BlogPosting` describing the same URL.
  const primaryEntity: Record<string, unknown> = {
    "@type": type === "article" ? "Article" : "WebPage",
    name: seo.title,
    headline: seo.title,
    description: seo.description,
    url: canonical,
    inLanguage: site.locale.replace("_", "-"),
    isPartOf: { "@type": "WebSite", name: site.name, url: site.url }
  };

  const structuredData: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: absolute(site.defaultImage, site.url)
    },
    {
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: site.description
    }
  ];

  if (seo.structuredData) {
    const extra = Array.isArray(seo.structuredData) ? seo.structuredData : [seo.structuredData];
    structuredData.push(...extra.map((entry, index) => (index === 0 ? { ...primaryEntity, ...entry } : entry)));
  } else {
    structuredData.push(primaryEntity);
  }

  return {
    title: seo.title,
    description: seo.description,
    canonical,
    image,
    type,
    robots,
    keywords: seo.keywords?.length ? seo.keywords.join(", ") : undefined,
    jsonLd: escapeJsonLd({ "@context": "https://schema.org", "@graph": structuredData })
  };
}
