import { routes, type VercelConfig } from "@vercel/config/v1";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");

export const config: VercelConfig = {
  framework: "vite",
  buildCommand: "pnpm build",
  outputDirectory: "dist/client",
  cleanUrls: true,
  rewrites: apiOrigin
    ? [routes.rewrite("/api/(.*)", `${apiOrigin}/api/$1`)]
    : []
};
