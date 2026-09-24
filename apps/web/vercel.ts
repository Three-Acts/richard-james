import { routes, type VercelConfig } from "@vercel/config/v1";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");

// An unset API_ORIGIN used to silently emit no rewrites at all — a green
// production build that ships with every `/api/*` call 404ing. Local/preview
// builds still work with zero env (rewrites just come back empty).
if (process.env.VERCEL_ENV === "production" && !apiOrigin) {
  throw new Error(
    "API_ORIGIN must be set for a production Vercel build so /api/* can be rewritten to the deployed API app."
  );
}

export const config: VercelConfig = {
  framework: "astro",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  cleanUrls: true,
  rewrites: apiOrigin
    ? [routes.rewrite("/api/(.*)", `${apiOrigin}/api/$1`)]
    : []
};
