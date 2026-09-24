import type { VercelRequest } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./http";
import { getSession } from "./neon-auth";

/**
 * Guards every `/api/cms/*` route plus `/api/deploy` and `/api/deploy-status`.
 *
 * A bearer token is accepted when either:
 * (a) `PUBLISH_TOKEN` is set and the token equals it, compared in constant
 *     time so response timing can't leak the token (scripts/CI); or
 * (b) `NEON_AUTH_BASE_URL` is set and `GET {NEON_AUTH_BASE_URL}/get-session`
 *     with `Cookie: <session cookie>=<token>` returns a live session (the
 *     CMS's editor login). Positive results are cached in module memory for
 *     60s, keyed by token, capped at 500 entries, to avoid round-tripping to
 *     Neon Auth on every request.
 *
 * Auth is required in every environment: when neither `PUBLISH_TOKEN` nor
 * `NEON_AUTH_BASE_URL` is configured, every call is rejected with a 503 —
 * there is no dev-mode bypass.
 *
 * Throws `ApiError`; call from within a `withApi` handler so it's converted
 * into the right HTTP response.
 */

const POSITIVE_CACHE_TTL_MS = 60_000;
const POSITIVE_CACHE_MAX_SIZE = 500;

const positiveCache = new Map<string, number>(); // token -> expiry epoch ms

function cacheHit(token: string): boolean {
  const expiresAt = positiveCache.get(token);
  if (expiresAt === undefined) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    positiveCache.delete(token);
    return false;
  }
  return true;
}

/** Removes `token` from the positive cache. Call on sign-out so a signed-out token is rejected immediately instead of for up to 60s. */
export function forgetSessionToken(token: string): void {
  positiveCache.delete(token);
}

function cacheStore(token: string): void {
  if (!positiveCache.has(token) && positiveCache.size >= POSITIVE_CACHE_MAX_SIZE) {
    // Map preserves insertion order; drop the oldest entry to cap memory.
    const oldestKey = positiveCache.keys().next().value;
    if (oldestKey !== undefined) {
      positiveCache.delete(oldestKey);
    }
  }
  positiveCache.set(token, Date.now() + POSITIVE_CACHE_TTL_MS);
}

function constantTimeEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

/** Exported for `/api/auth/session` and `/api/auth/sign-out`, which need the raw bearer token itself. */
export function extractBearerToken(request: VercelRequest): string | undefined {
  const header = request.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function requireAuth(request: VercelRequest): Promise<void> {
  const publishToken = process.env.PUBLISH_TOKEN;
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

  if (!publishToken && !authBaseUrl) {
    throw new ApiError(503, "publishing_unconfigured", "Set PUBLISH_TOKEN or NEON_AUTH_BASE_URL to enable this endpoint.");
  }

  const token = extractBearerToken(request);
  if (!token) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }

  if (publishToken && constantTimeEquals(publishToken, token)) {
    return;
  }

  if (authBaseUrl) {
    if (cacheHit(token)) {
      return;
    }

    const session = await getSession(token);
    if (session) {
      cacheStore(token);
      return;
    }
  }

  throw new ApiError(401, "unauthorized", "Unauthorized.");
}
