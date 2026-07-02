import type { ReactNode } from "react";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

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

export type RouteRenderMode = "static" | "client";

export type AppRoute = {
  path: string;
  label: string;
  renderMode: RouteRenderMode;
  includeInSitemap: boolean;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  seo: SeoMetadata;
  render: () => ReactNode;
};

export const site = {
  name: "Three Acts",
  url: (import.meta.env.VITE_SITE_URL ?? "https://example.com").replace(/\/+$/, ""),
  description:
    "A static-first marketing website starter built on pure Vite and React, backed by Supabase and deployed on Vercel.",
  /** Local raster (compressed to AVIF at build) used as the default social image. */
  defaultImage: "/og-default.png",
  locale: "en_US",
  twitter: "@threeacts"
} as const;

/** Public navigation, decoupled from the route table so build-only content routes can appear too. */
export const navLinks: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" }
];

/**
 * Code-defined routes with no build-time data dependency. These are the only
 * routes shipped to the browser bundle (via the SPA router), so nothing here
 * may import the content layer. Content-derived routes are added at build time
 * in `build-routes.ts`.
 */
export const codeRoutes: AppRoute[] = [
  {
    path: "/",
    label: "Home",
    renderMode: "static",
    includeInSitemap: true,
    changefreq: "weekly",
    priority: 1,
    seo: {
      title: "Three Acts | Static marketing website starter",
      description:
        "Three Acts is a marketing website starter for story-led launches, conversion pages, and static SEO performance.",
      canonicalPath: "/",
      type: "website"
    },
    render: () => <HomePage />
  },
  {
    path: "/about",
    label: "About",
    renderMode: "static",
    includeInSitemap: true,
    changefreq: "monthly",
    priority: 0.7,
    seo: {
      title: "About Three Acts",
      description:
        "Meet the marketing strategy behind Three Acts: sharp positioning, static performance, and CMS-backed launch operations.",
      canonicalPath: "/about",
      type: "website"
    },
    render: () => <AboutPage />
  },
  {
    // Client route: not prerendered with content, boots as an SPA and fetches live data at runtime.
    path: "/dashboard",
    label: "Dashboard",
    renderMode: "client",
    includeInSitemap: false,
    seo: {
      title: "Dashboard | Three Acts",
      description: "Authenticated dashboard shell that runs as a client-side app.",
      canonicalPath: "/dashboard",
      noindex: true
    },
    render: () => <DashboardPage />
  }
];

/** Routes the SPA/browser bundle knows how to client-render. */
export const clientRoutes: AppRoute[] = codeRoutes;

export const notFoundRoute: AppRoute = {
  path: "/404",
  label: "Not found",
  renderMode: "static",
  includeInSitemap: false,
  seo: {
    title: "Page not found | Three Acts",
    description: "The page you were looking for could not be found.",
    canonicalPath: "/404",
    noindex: true
  },
  render: () => <NotFoundPage />
};

function normalizePath(pathname: string) {
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

/** Match a concrete pathname against a resolved route list. Returns undefined for 404. */
export function matchRoute(routes: AppRoute[], pathname: string) {
  const normalized = normalizePath(pathname);
  return routes.find((route) => route.path === normalized);
}
