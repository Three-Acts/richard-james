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
      description: site.description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${site.url}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": type === "article" ? "Article" : "WebPage",
      name: seo.title,
      headline: seo.title,
      description: seo.description,
      url: canonical,
      inLanguage: site.locale.replace("_", "-"),
      isPartOf: { "@type": "WebSite", name: site.name, url: site.url }
    }
  ];

  if (seo.structuredData) {
    structuredData.push(...(Array.isArray(seo.structuredData) ? seo.structuredData : [seo.structuredData]));
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
