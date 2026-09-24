import type { VercelRequest } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./http";

/**
 * Guards the CMS "Publish" endpoints (`/api/deploy`, `/api/deploy-status`).
 *
 * When `PUBLISH_TOKEN` is set, the caller must send it as
 * `Authorization: Bearer <PUBLISH_TOKEN>`, compared in constant time so
 * response timing can't leak the token. When `PUBLISH_TOKEN` is unset,
 * requests are allowed outside production (local dev) but rejected with a
 * 503 in production, so publishing never runs unauthenticated live.
 *
 * Throws `ApiError`; call from within a `withApi` handler so it's converted
 * into the right HTTP response.
 */
export function requireAuth(request: VercelRequest): void {
  const token = process.env.PUBLISH_TOKEN;

  if (!token) {
    if (process.env.VERCEL_ENV !== "production") {
      return;
    }

    throw new ApiError(503, "publishing_unconfigured", "Set PUBLISH_TOKEN to enable publishing.");
  }

  const header = request.headers.authorization;
  const provided = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";

  const expected = Buffer.from(token);
  const actual = Buffer.from(provided);
  const isAuthorized = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!isAuthorized) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }
}
