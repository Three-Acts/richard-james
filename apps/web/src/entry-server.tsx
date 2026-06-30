import { renderToString } from "react-dom/server";
import { App } from "./App";
import { getRoute, prerenderRoutes, routes, sitemapRoutes, site } from "./routes";
import "./styles.css";

export { prerenderRoutes, routes, sitemapRoutes, site };

export function render(url: string) {
  const route = getRoute(url);
  const canonicalUrl = new URL(route.seo.canonicalPath, site.url).toString();
  const appHtml = renderToString(<App url={url} />);

  const head = [
    `<title>${escapeHtml(route.seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.seo.description)}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(route.seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.seo.description)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`
  ].join("\n    ");

  return { appHtml, head };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
