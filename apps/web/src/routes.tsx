import type { ReactNode } from "react";
import { AboutPage } from "./pages/AboutPage";
import { HomePage } from "./pages/HomePage";

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
};

export type StaticRoute = {
  path: string;
  seo: SeoMetadata;
  render: () => ReactNode;
};

export const site = {
  name: "Three Acts",
  url: import.meta.env.VITE_SITE_URL ?? "https://example.com"
};

export const routes: StaticRoute[] = [
  {
    path: "/",
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
    seo: {
      title: "About Three Acts",
      description:
        "Meet the marketing strategy behind Three Acts: sharp positioning, static performance, and CMS-backed launch operations.",
      canonicalPath: "/about"
    },
    render: () => <AboutPage />
  }
];

export function getRoute(pathname: string) {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return routes.find((route) => route.path === normalizedPath) ?? routes[0];
}
