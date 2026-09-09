// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const apiOrigin = env.API_ORIGIN;

// https://astro.build/config
export default defineConfig({
  // Canonical origin, baked into canonicals, sitemap, robots.txt, and llms.txt
  // (exposed to code as `import.meta.env.SITE`).
  site: (env.VITE_SITE_URL ?? "https://example.com").replace(/\/+$/, ""),
  output: "static",
  integrations: [react()],
  vite: {
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
      : undefined,
    ssr: {
      // Bundle these for the build-time render so they resolve cleanly under pnpm.
      noExternal: ["@base-ui-components/react", "@supabase/supabase-js"]
    }
  }
});
