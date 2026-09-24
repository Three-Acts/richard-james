import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * Single source of truth for the site's canonical origin.
 *
 * astro.config.mjs reads `.env` through Vite's `loadEnv` into a local object
 * (loadEnv does NOT populate `process.env`), while `scripts/gen-sitemap.mjs`
 * runs afterwards in its own plain `node` process, after `astro build` has
 * already exited — it has no Vite context, so it calls `loadEnv` itself here
 * too, rather than re-reading `process.env` directly (which would silently
 * miss anything only set in `.env`).
 *
 * A production Vercel build with no `VITE_SITE_URL` used to silently fall
 * back to a placeholder — a green build that ships wrong canonicals,
 * sitemap, and social tags. Prefer the env var; on Vercel production, derive
 * the origin from the platform instead of guessing; only fall back to the
 * known production domain for local/dev builds — this project has exactly
 * one real domain, so a placeholder like example.com buys nothing.
 */
export function resolveSiteUrl() {
  const env = loadEnv(process.env.NODE_ENV ?? "production", webRoot, "");

  if (env.VITE_SITE_URL) {
    return env.VITE_SITE_URL.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_ENV === "production") {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    throw new Error(
      "VITE_SITE_URL must be set for a production Vercel build (VERCEL_PROJECT_PRODUCTION_URL was not available to derive it from either)."
    );
  }

  return "https://www.richardjamesart.com";
}
