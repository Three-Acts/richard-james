import { routes, type VercelConfig } from "@vercel/config/v1";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");

export const config: VercelConfig = {
  framework: "astro",
  buildCommand: "pnpm build",
  outputDirectory: "dist",
  cleanUrls: true,
  rewrites: apiOrigin
    ? [routes.rewrite("/api/(.*)", `${apiOrigin}/api/$1`)]
    : []
};
