import type { APIRoute } from "astro";
import { getSitemapPages } from "../page-meta";
import { site } from "../site";

/**
 * llms.txt — curated index for AI answer engines (AEO). See https://llmstxt.org
 * Static-file endpoint: written to `dist/llms.txt` at build time.
 */
export const GET: APIRoute = async () => {
  const pages = await getSitemapPages();

  const llms = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "## Pages",
    ...pages.map((page) => {
      const loc = new URL(page.seo.canonicalPath, site.url).toString();
      return `- [${page.seo.title}](${loc}): ${page.seo.description}`;
    }),
    ""
  ].join("\n");

  return new Response(llms, { headers: { "Content-Type": "text/plain" } });
};
