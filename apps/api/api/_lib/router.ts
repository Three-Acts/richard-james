import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions } from "./cors";

import health from "../_routes/health";
import meta from "../_routes/meta";
import deploy from "../_routes/deploy";
import deployStatus from "../_routes/deploy-status";
import contentSite from "../_routes/content/site";
import contentProjects from "../_routes/content/projects";
import contentProjectBySlug from "../_routes/content/projects/[slug]";
import contentPages from "../_routes/content/pages";
import contentPageBySlug from "../_routes/content/pages/[slug]";
import authSignIn from "../_routes/auth/sign-in";
import authSession from "../_routes/auth/session";
import authSignOut from "../_routes/auth/sign-out";
import cmsCollections from "../_routes/cms/collections";
import cmsRecords from "../_routes/cms/collections/[collectionId]/records";
import cmsRecordById from "../_routes/cms/collections/[collectionId]/records/[recordId]";
import cmsImport from "../_routes/cms/collections/[collectionId]/import";
import cmsAssets from "../_routes/cms/collections/[collectionId]/assets/[fieldKey]";
import cmsStatus from "../_routes/cms/collections/[collectionId]/status";
import cmsPublish from "../_routes/cms/publish";

export type ApiHandler = (request: VercelRequest, response: VercelResponse) => void | Promise<void>;

// The route table Vercel would otherwise infer from the filesystem (one
// function per file under api/). Handlers live under api/_routes/** (a
// directory Vercel ignores, since its name starts with `_`) and are wired up
// here by hand instead. Imports are *static* (not dynamic `import()`) so
// Vercel's file tracer bundles every handler into the single
// `api/[...path].ts` function that actually gets deployed — see that file's
// comment for why there's only one function. `[param]` segments (e.g.
// `[collectionId]`) match any single path segment and land in
// `request.query`, same as Vercel's own filesystem routing.
const routes = {
  "/api/health": health,
  "/api/meta": meta,
  "/api/deploy": deploy,
  "/api/deploy-status": deployStatus,
  "/api/content/site": contentSite,
  "/api/content/projects": contentProjects,
  "/api/content/projects/[slug]": contentProjectBySlug,
  "/api/content/pages": contentPages,
  "/api/content/pages/[slug]": contentPageBySlug,
  "/api/auth/sign-in": authSignIn,
  "/api/auth/session": authSession,
  "/api/auth/sign-out": authSignOut,
  "/api/cms/collections": cmsCollections,
  "/api/cms/collections/[collectionId]/records": cmsRecords,
  "/api/cms/collections/[collectionId]/records/[recordId]": cmsRecordById,
  "/api/cms/collections/[collectionId]/import": cmsImport,
  "/api/cms/collections/[collectionId]/assets/[fieldKey]": cmsAssets,
  "/api/cms/collections/[collectionId]/status": cmsStatus,
  "/api/cms/publish": cmsPublish
} satisfies Record<string, ApiHandler>;

type CompiledRoute = {
  regex: RegExp;
  paramNames: string[];
  handler: ApiHandler;
};

const dynamicSegment = /^\[(.+)\]$/;

/** Turns a route pattern like `/api/cms/collections/[collectionId]/records` into a matcher + its param names. */
function compileRoute(pattern: string, handler: ApiHandler): CompiledRoute {
  const paramNames: string[] = [];

  const regexSegments = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const dynamicMatch = segment.match(dynamicSegment);
      if (dynamicMatch) {
        paramNames.push(dynamicMatch[1]);
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });

  return {
    regex: new RegExp(`^/${regexSegments.join("/")}/?$`),
    paramNames,
    handler
  };
}

const compiledRoutes = Object.entries(routes).map(([pattern, handler]) => compileRoute(pattern, handler));

export type RouteMatch =
  | { kind: "matched"; handler: ApiHandler; params: Record<string, string> }
  | { kind: "malformed" }
  | undefined;

/**
 * First matching route for `pathname`, plus the dynamic segment values
 * extracted (and percent-decoded) from it. A segment that isn't valid
 * percent-encoding (e.g. `%zz`) yields `{ kind: "malformed" }` instead of
 * throwing, so the caller can answer 400 rather than crash the function.
 */
export function matchRoute(pathname: string): RouteMatch {
  for (const route of compiledRoutes) {
    const match = route.regex.exec(pathname);
    if (!match) {
      continue;
    }

    const params: Record<string, string> = {};
    try {
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
    } catch {
      return { kind: "malformed" };
    }

    return { kind: "matched", handler: route.handler, params };
  }

  return undefined;
}

/**
 * Matches `pathname` against the route table and invokes the handler,
 * merging the matched dynamic-segment params into `request.query` (params
 * win over a same-named search param, matching Vercel's own dynamic-route
 * query). Shared by the single Vercel entrypoint (`api/index.ts`) and the
 * local dev server, so routing behaves identically in both.
 */
export async function dispatch(request: VercelRequest, response: VercelResponse, pathname: string): Promise<void> {
  const matched = matchRoute(pathname);

  if (matched?.kind !== "matched") {
    if (handleOptions(request, response)) {
      return;
    }

    applyCors(request, response);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    if (matched?.kind === "malformed") {
      response.status(400).json({
        ok: false,
        error: {
          code: "invalid_path",
          message: "Request path contains malformed percent-encoding."
        }
      });
      return;
    }
    response.status(404).json({
      ok: false,
      error: {
        code: "not_found",
        message: "API route not found."
      }
    });
    return;
  }

  // Route params win over a same-named search param, matching Vercel's own
  // dynamic-route query.
  request.query = { ...request.query, ...matched.params };
  await matched.handler(request, response);
}
