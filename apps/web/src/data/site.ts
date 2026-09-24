export type NavItem = {
  label: string
  href: string
}

// `import.meta.env.SITE` is Astro's resolved `site` config value (VITE_SITE_URL
// at build time, derived from the Vercel project on production, or the
// production domain in local dev — see scripts/site-origin.mjs
// `resolveSiteUrl`). This file is also imported directly by plain node/tsx
// scripts outside Astro, where `import.meta.env` doesn't exist at all — guard
// the read rather than let it throw, falling back to the one real production
// domain either way.
const siteUrl =
  (typeof import.meta.env !== "undefined" && import.meta.env.SITE) || "https://www.richardjamesart.com"

/**
 * The only site data that's truly static (not part of the published content
 * the API serves via `SiteContent` — see `@/content`). Everything else
 * (name, tagline, location, contact details, description) comes from
 * `getContentSource().getSite()`; Base.astro fetches it once per page and
 * passes it down to Seo/Nav/Menu/Footer/Preloader as a `site` prop.
 */
export const site = {
  url: siteUrl.replace(/\/+$/, ""),
  fonts: { display: "Cinzel", body: "Quattrocento" }
} as const

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Essay", href: "/essay" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" }
]
