export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  /** OG/Twitter image, local (`/og.png`) or absolute URL. Falls back to `site.defaultImage`. */
  image?: string;
  type?: "website" | "article";
  /** Emit `noindex,nofollow` for this route. */
  noindex?: boolean;
  keywords?: string[];
  /** ISO timestamp for sitemap `<lastmod>`. */
  lastmod?: string;
  /** Extra JSON-LD graph node(s) merged into the page structured data. */
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

export const site = {
  name: "Three Acts",
  // `site` from astro.config.mjs (sourced from VITE_SITE_URL at build time).
  url: (import.meta.env.SITE ?? "https://example.com").replace(/\/+$/, ""),
  description:
    "A static-first marketing website starter built on Astro and React, backed by Supabase and deployed on Vercel.",
  /** Local raster (compressed to AVIF at build) used as the default social image. */
  defaultImage: "/og-default.png",
  locale: "en_US",
  twitter: "@threeacts"
} as const;

/** Public navigation, decoupled from the page files so content routes can appear too. */
export const navLinks: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" }
];
