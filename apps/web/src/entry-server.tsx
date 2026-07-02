import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { Layout } from "./components/layout/layout";
import { buildHead } from "./lib/seo";
import { getRoutes } from "./build-routes";
import { notFoundRoute, site, type AppRoute } from "./routes";

export { getRoutes, notFoundRoute, site };

/**
 * Server render for a single resolved route. Static/content routes render the
 * full layout + page into HTML (for zero-JS delivery and indexing); client
 * routes render an empty body (see prerender) and boot as an SPA.
 */
export function render(route: AppRoute) {
  const appHtml = renderToString(
    <StaticRouter location={route.path}>
      <Layout>{route.render()}</Layout>
    </StaticRouter>
  );

  return { appHtml, head: buildHead(route, site) };
}

/** Head-only render for client-route shells (no body content baked). */
export function renderHead(route: AppRoute) {
  return buildHead(route, site);
}
