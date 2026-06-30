import type { ReactNode } from "react";
import { AboutPage } from "./pages/AboutPage";
import { HomePage } from "./pages/HomePage";

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
};

export type RouteRenderMode = "static" | "client";

export type AppRoute = {
  path: string;
  label: string;
  renderMode: RouteRenderMode;
  includeInSitemap: boolean;
  seo: SeoMetadata;
  render: () => ReactNode;
};

export const site = {
  name: "Three Acts",
  url: import.meta.env.VITE_SITE_URL ?? "https://example.com"
};

export const routes: AppRoute[] = [
  {
    path: "/",
    label: "Home",
    renderMode: "static",
    includeInSitemap: true,
    seo: {
      title: "Three Acts | Static marketing website starter",
      description:
        "Three Acts is a marketing website starter for story-led launches, conversion pages, and static SEO performance.",
      canonicalPath: "/"
    },
    render: () => <HomePage />
  },
  {
    path: "/about",
    label: "About",
    renderMode: "static",
    includeInSitemap: true,
    seo: {
      title: "About Three Acts",
      description:
        "Meet the marketing strategy behind Three Acts: sharp positioning, static performance, and CMS-backed launch operations.",
      canonicalPath: "/about"
    },
    render: () => <AboutPage />
  }
];

export const prerenderRoutes = routes.filter((route) => route.renderMode === "static");

export const sitemapRoutes = routes.filter((route) => route.includeInSitemap);

export function getRoute(pathname: string) {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return routes.find((route) => route.path === normalizedPath) ?? routes[0];
}
