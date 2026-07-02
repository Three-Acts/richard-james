import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

/**
 * Development server. Runs Vite in middleware mode and server-renders every
 * request through the same `entry-server` used at build — so dev shows live
 * data and mirrors the production rendering model (static pages SSR'd, islands
 * hydrated, client routes booting as an SPA). The build step
 * (`vite build` + prerender) freezes the same output into static files.
 */
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST ?? "0.0.0.0";

const vite = await createViteServer({
  root: appRoot,
  appType: "custom",
  server: { middlewareMode: true, host }
});

// Dev-only: load the global stylesheet (Vite serves CSS as a style-injecting
// module). Keeps zero-JS static pages styled during development.
const styleScript = '<script type="module" src="/src/styles.css"></script>';

const server = createHttpServer((req, res) => {
  vite.middlewares(req, res, async () => {
    const url = req.url ?? "/";
    try {
      const pathname = new URL(url, `http://${req.headers.host ?? host}`).pathname;
      const { getRoutes, render, renderHead, notFoundRoute } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const { matchRoute } = await vite.ssrLoadModule("/src/routes.tsx");

      const routes = await getRoutes();
      const matched = matchRoute(routes, pathname);
      const route = matched ?? notFoundRoute;

      let head;
      let appHtml;
      let scripts;
      if (route.renderMode === "client") {
        head = renderHead(route);
        appHtml = "";
        scripts = `${styleScript}<script type="module" src="/src/entry-client.tsx"></script>`;
      } else {
        const rendered = render(route);
        head = rendered.head;
        appHtml = rendered.appHtml;
        const hasIslands = appHtml.includes('data-island="');
        scripts = hasIslands ? `${styleScript}<script type="module" src="/src/islands-client.tsx"></script>` : styleScript;
      }

      let template = await readFile(path.join(appRoot, "index.html"), "utf8");
      template = await vite.transformIndexHtml(url, template);
      const html = template
        .replace("<!--app-head-->", head)
        .replace("<!--app-html-->", appHtml)
        .replace("<!--app-scripts-->", scripts);

      res.statusCode = matched ? 200 : 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  });
});

server.listen(port, host, () => {
  console.log(`web dev (SSR) → http://localhost:${port}`);
});
