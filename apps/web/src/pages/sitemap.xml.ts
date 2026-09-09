import type { APIRoute } from "astro";
import { getSitemapPages } from "../page-meta";
import { site } from "../site";

/** Static-file endpoint: written to `dist/sitemap.xml` at build time. */
export const GET: APIRoute = async () => {
  const pages = await getSitemapPages();

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((page) => {
      const loc = new URL(page.seo.canonicalPath, site.url).toString();
      const parts = [`    <loc>${loc}</loc>`];
      if (page.seo.lastmod) {
        parts.push(`    <lastmod>${new Date(page.seo.lastmod).toISOString()}</lastmod>`);
      }
      if (page.changefreq) {
        parts.push(`    <changefreq>${page.changefreq}</changefreq>`);
      }
      if (typeof page.priority === "number") {
        parts.push(`    <priority>${page.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    }),
    "</urlset>"
  ].join("\n");

  return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
};
