// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { resolveSiteUrl } from "./scripts/site-origin.mjs";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const apiOrigin = env.API_ORIGIN;

// https://astro.build/config
export default defineConfig({
  // Canonical origin, baked into canonicals, sitemap, robots.txt, and llms.txt
  // (exposed to code as `import.meta.env.SITE`).
  site: resolveSiteUrl(),
  output: "static",

  // Emit about.html / projects/<slug>.html rather than about/index.html, which
  // is what vercel.ts's cleanUrls + trailingSlash:false expect.
  build: { format: "file" },
  trailingSlash: "never",

  server: { port: 5199, host: true },
  // `astro preview` reuses the server block unless overridden.
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    plugins: [tailwindcss()],
    // Same-origin `/api/*` in dev, proxied to the API app (Vercel rewrite in prod).
    server: apiOrigin
      ? {
          proxy: {
            "/api": {
              target: apiOrigin,
              changeOrigin: true
            }
          }
        }
      : undefined
  }
});
