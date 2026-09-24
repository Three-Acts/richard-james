import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dispatch } from "./_lib/router.js";

/**
 * The single Vercel Serverless Function for this app.
 *
 * Vercel's Hobby plan caps a deployment at 12 Serverless Functions, and
 * Vercel builds one function per file under api/ — this app has more routes
 * than that. So every route handler lives under api/_routes/** (Vercel's
 * function scan skips paths whose name starts with `_`), and this file is the
 * only one left for Vercel to build. vercel.json rewrites every `/api/*`
 * request here; the function still receives the original URL (the same
 * mechanism the "Express on Vercel" pattern relies on), so the pathname is
 * read straight from `request.url` and dispatched through api/_lib/router.ts,
 * which reproduces Vercel's filesystem routing (including `[param]` segments)
 * with static imports so the file tracer bundles every handler in here.
 *
 * (A `[...path].ts` catch-all does NOT work for plain Vercel functions: the
 * builder treats it as a single dynamic segment, so nested paths 404.)
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  let pathname = url.pathname;

  // The rewrite's `:path*` segment also arrives as `request.query.path`
  // (e.g. "content/projects/x"). If the platform hands us the rewritten URL
  // (`/api?path=...`) instead of the original one, rebuild the pathname from
  // it; either way, strip it so handlers only see their own query params.
  const rawPath = request.query.path;
  if (rawPath !== undefined) {
    if (pathname === "/api" || pathname === "/api/" || pathname === "/api/index") {
      // The query value is already percent-decoded by the platform, while
      // the router decodes every dynamic segment once (as it does for a raw
      // URL pathname) — so re-encode each segment here to keep that single
      // decode correct for values containing `%` or spaces.
      const segments = Array.isArray(rawPath) ? rawPath : rawPath.split("/");
      pathname = `/api/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
    }
    delete request.query.path;
  }

  // `withApi` (see _lib/http.ts) reads `request.url` to detect `/api/cms/*`
  // routes (no-store caching + DB timing), so keep it canonical too.
  url.searchParams.delete("path");
  const search = url.searchParams.toString();
  request.url = search ? `${pathname}?${search}` : pathname;

  await dispatch(request, response, pathname);
}
