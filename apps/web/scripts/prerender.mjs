import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDist = path.join(appRoot, "dist/client");
const serverEntry = path.join(appRoot, "dist/server/entry-server.js");

const template = await readFile(path.join(appRoot, "index.html"), "utf8");
const manifest = JSON.parse(await readFile(path.join(clientDist, ".vite/manifest.json"), "utf8"));
const { getRoutes, render, renderHead, notFoundRoute, site } = await import(serverEntry);

const findEntry = (name) => Object.values(manifest).find((chunk) => chunk.isEntry && chunk.name === name);
const entryClient = findEntry("entry-client");
const islandsClient = findEntry("islands-client");

const cssHrefs = [
  ...new Set([...(entryClient?.css ?? []), ...(islandsClient?.css ?? [])])
].map((file) => `<link rel="stylesheet" href="/${file}" />`);

const scriptTag = (file) => `<script type="module" crossorigin src="/${file}"></script>`;

function buildDocument({ head, appHtml, scripts }) {
  return template
    .replace("<!--app-head-->", [...cssHrefs, head].join("\n    "))
    .replace("<!--app-html-->", appHtml)
    .replace("<!--app-scripts-->", scripts);
}

async function writePage(routePath, html) {
  const outputDir = routePath === "/" ? clientDist : path.join(clientDist, routePath);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), html);
}

const routes = await getRoutes();

for (const route of routes) {
  if (route.renderMode === "client") {
    // SPA shell: baked SEO head, empty body, full app bundle. Doubles as the
    // fallback for this route so no Vercel rewrite is needed.
    const html = buildDocument({
      head: renderHead(route),
      appHtml: "",
      scripts: entryClient ? scriptTag(entryClient.file) : ""
    });
    await writePage(route.path, html);
    continue;
  }

  const { appHtml, head } = render(route);
  const hasIslands = appHtml.includes('data-island="');
  const scripts = hasIslands && islandsClient ? scriptTag(islandsClient.file) : "";
  await writePage(route.path, buildDocument({ appHtml, head, scripts }));
}

// Custom 404 (Vercel serves /404.html for unmatched paths on static output).
{
  const { appHtml, head } = render(notFoundRoute);
  await writeFile(path.join(clientDist, "404.html"), buildDocument({ appHtml, head, scripts: "" }));
}

// Sitemap — only routes flagged for inclusion.
const sitemapRoutes = routes.filter((route) => route.includeInSitemap);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.map((route) => {
    const loc = new URL(route.seo.canonicalPath, site.url).toString();
    const parts = [`    <loc>${loc}</loc>`];
    if (route.seo.lastmod) {
      parts.push(`    <lastmod>${new Date(route.seo.lastmod).toISOString()}</lastmod>`);
    }
    if (route.changefreq) {
      parts.push(`    <changefreq>${route.changefreq}</changefreq>`);
    }
    if (typeof route.priority === "number") {
      parts.push(`    <priority>${route.priority.toFixed(1)}</priority>`);
    }
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  }),
  "</urlset>"
].join("\n");
await writeFile(path.join(clientDist, "sitemap.xml"), sitemap);

// robots.txt — allow all crawlers (including AI answer-engine bots) + sitemap.
await writeFile(
  path.join(clientDist, "robots.txt"),
  [
    "# All crawlers, including AI answer engines (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), are welcome.",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("/sitemap.xml", site.url).toString()}`,
    ""
  ].join("\n")
);

// llms.txt — curated index for AI answer engines (AEO). See https://llmstxt.org
const llms = [
  `# ${site.name}`,
  "",
  `> ${site.description}`,
  "",
  "## Pages",
  ...sitemapRoutes.map((route) => {
    const loc = new URL(route.seo.canonicalPath, site.url).toString();
    return `- [${route.seo.title}](${loc}): ${route.seo.description}`;
  }),
  ""
].join("\n");
await writeFile(path.join(clientDist, "llms.txt"), llms);

console.log(
  `Prerendered ${routes.filter((r) => r.renderMode !== "client").length} static page(s), ` +
    `${routes.filter((r) => r.renderMode === "client").length} client shell(s), sitemap, robots.txt, llms.txt.`
);
