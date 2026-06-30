import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDist = path.join(appRoot, "dist/client");
const serverEntry = path.join(appRoot, "dist/server/entry-server.js");
const template = await readFile(path.join(clientDist, "index.html"), "utf8");
const { render, prerenderRoutes, sitemapRoutes, site } = await import(serverEntry);

for (const route of prerenderRoutes) {
  const { appHtml, head } = render(route.path);
  const html = template.replace("<!--app-head-->", head).replace("<!--app-html-->", appHtml);
  const outputDir = route.path === "/" ? clientDist : path.join(clientDist, route.path);

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), html);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.map((route) => {
    const location = new URL(route.seo.canonicalPath, site.url).toString();
    return `  <url><loc>${location}</loc></url>`;
  }),
  "</urlset>"
].join("\n");

await writeFile(path.join(clientDist, "sitemap.xml"), sitemap);
await writeFile(
  path.join(clientDist, "robots.txt"),
  ["User-agent: *", "Allow: /", "", `Sitemap: ${new URL("/sitemap.xml", site.url).toString()}`, ""].join("\n")
);
