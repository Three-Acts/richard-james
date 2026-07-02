import type { AppRoute, site as Site } from "../routes";

type SiteConfig = typeof Site;

function escapeAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Escape a JSON-LD payload so it cannot break out of the <script> element. */
function escapeJsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function absolute(pathOrUrl: string, base: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, base).toString();
}

/**
 * Builds the full `<head>` markup for a route: title, description, canonical,
 * robots, Open Graph, Twitter, favicons, theme-color, and JSON-LD structured
 * data (Organization + WebSite site-wide, plus WebPage/Article per page).
 *
 * Structured data doubles as AEO (answer-engine optimization): AI search
 * crawlers read JSON-LD to understand and cite pages.
 */
export function buildHead(route: AppRoute, site: SiteConfig): string {
  const { seo } = route;
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": structuredData
  };

  const tags = [
    `<title>${escapeAttr(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}" />`,
    seo.keywords?.length ? `<meta name="keywords" content="${escapeAttr(seo.keywords.join(", "))}" />` : "",
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta name="theme-color" content="#000000" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    // Open Graph
    `<meta property="og:site_name" content="${escapeAttr(site.name)}" />`,
    `<meta property="og:title" content="${escapeAttr(seo.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:image" content="${escapeAttr(image)}" />`,
    `<meta property="og:locale" content="${escapeAttr(site.locale)}" />`,
    // Twitter
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="${escapeAttr(site.twitter)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(image)}" />`,
    // Structured data (SEO + AEO)
    `<script type="application/ld+json">${escapeJsonLd(jsonLd)}</script>`
  ];

  return tags.filter(Boolean).join("\n    ");
}
