import type { APIRoute } from "astro";
import { site } from "../site";

/** Static-file endpoint: written to `dist/robots.txt` at build time. */
export const GET: APIRoute = () => {
  const robots = [
    "# All crawlers, including AI answer engines (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), are welcome.",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("/sitemap.xml", site.url).toString()}`,
    ""
  ].join("\n");

  return new Response(robots, { headers: { "Content-Type": "text/plain" } });
};
