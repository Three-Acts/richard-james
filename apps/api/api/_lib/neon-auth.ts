import type { AuthSession } from "./schema.js";
import { ApiError } from "./http.js";

/**
 * Fetch wrappers for Neon Auth (managed Better Auth), reached over plain REST
 * at `NEON_AUTH_BASE_URL`. The CMS never talks to Neon Auth directly — every
 * call goes through these functions so `apps/api` stays the single place
 * that would change if the identity provider ever did.
 *
 * Neon Auth's JWTs expire after 15 minutes, so the token handed back to the
 * CMS (and accepted by `requireAuth`) is the opaque session COOKIE value, not
 * a JWT: `sign-in/email` sets it via `Set-Cookie`, and verification replays
 * it as `Cookie: <name>=<value>` against `get-session`.
 *
 * The cookie name was confirmed empirically against the live service (see
 * the migration report) to be `__Secure-neon-auth.session_token` (note the
 * hyphen in "neon-auth" — the spec's assumed `neonauth` was wrong); override
 * with `NEON_AUTH_SESSION_COOKIE` if Neon ever changes it.
 *
 * Also confirmed empirically: `sign-up/email` and `sign-out` both reject the
 * request with 403 `MISSING_OR_NULL_ORIGIN`/`MISSING_ORIGIN` unless an
 * `Origin` header is sent (`sign-in/email` and `get-session` don't need it,
 * but sending it there too is harmless). Localhost origins are pre-approved
 * by Neon Auth with no extra config; a real production origin needs
 * `neon neon-auth domain add <origin>` first. `sign-out` additionally
 * requires a JSON `Content-Type` with a body (an empty `{}` is enough) — a
 * bodyless POST is rejected as `UNSUPPORTED_MEDIA_TYPE`.
 */

const DEFAULT_SESSION_COOKIE_NAME = "__Secure-neon-auth.session_token";
const DEFAULT_ORIGIN = "http://localhost:5175";

export type NeonAuthUpstreamUser = {
  id: string;
  email: string;
  name?: string;
};

function baseUrl(): string {
  const url = process.env.NEON_AUTH_BASE_URL;
  if (!url) {
    throw new ApiError(503, "auth_unconfigured", "Set NEON_AUTH_BASE_URL to enable editor login.");
  }
  return url.replace(/\/+$/, "");
}

function sessionCookieName(): string {
  return process.env.NEON_AUTH_SESSION_COOKIE || DEFAULT_SESSION_COOKIE_NAME;
}

/** Origin sent on requests Neon Auth validates against its trusted-domains list (see the file header). */
function originHeader(): string {
  return process.env.NEON_AUTH_ORIGIN || DEFAULT_ORIGIN;
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(502, "auth_upstream_error", "Could not reach the auth service.");
  }
}

/** First `name=value` pair off a raw `Set-Cookie` header string (drops `Path=`, `HttpOnly`, etc). */
function parseCookiePair(setCookie: string): { name: string; value: string } | undefined {
  const first = setCookie.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq < 0) {
    return undefined;
  }
  return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
}

/** Picks the session cookie's value from a sign-in response's `Set-Cookie` headers. */
function extractSessionToken(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  const pairs = setCookies.map(parseCookiePair).filter((pair): pair is { name: string; value: string } => Boolean(pair));

  const configuredName = sessionCookieName();
  const matched = pairs.find((pair) => pair.name === configuredName);
  if (matched) {
    return matched.value;
  }

  // Fall back to the only cookie set, in case NEON_AUTH_SESSION_COOKIE drifts
  // from what the live service actually sends.
  if (pairs.length === 1) {
    return pairs[0].value;
  }

  throw new ApiError(502, "auth_upstream_error", "Auth service did not return a session cookie.");
}

function nameFallback(email: string): string {
  const local = email.split("@")[0];
  return local && local.trim() ? local : email;
}

type UpstreamSessionPayload = {
  session?: { token?: string; expiresAt?: string } | null;
  user?: NeonAuthUpstreamUser | null;
};

function toAuthSession(token: string, payload: UpstreamSessionPayload): AuthSession | null {
  if (!payload.session || !payload.user?.id || !payload.user.email) {
    return null;
  }

  return {
    token,
    expiresAt: payload.session.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name && payload.user.name.trim() ? payload.user.name : nameFallback(payload.user.email)
    }
  };
}

/** `GET {NEON_AUTH_BASE_URL}/get-session` — null when the cookie is missing/expired/invalid. */
export async function getSession(token: string): Promise<AuthSession | null> {
  const response = await safeFetch(`${baseUrl()}/get-session`, {
    method: "GET",
    headers: { Cookie: `${sessionCookieName()}=${token}` }
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new ApiError(502, "auth_upstream_error", "Auth service error.");
  }

  const payload = (await response.json().catch(() => null)) as UpstreamSessionPayload | null;
  return payload ? toAuthSession(token, payload) : null;
}

/** `POST {NEON_AUTH_BASE_URL}/sign-in/email` then `get-session` to read the user + expiry. */
export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const response = await safeFetch(`${baseUrl()}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: originHeader() },
    body: JSON.stringify({ email, password })
  });

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
  }
  if (!response.ok) {
    throw new ApiError(502, "auth_upstream_error", "Auth service error.");
  }

  const token = extractSessionToken(response);
  const session = await getSession(token);
  if (!session) {
    throw new ApiError(502, "auth_upstream_error", "Sign-in did not produce a valid session.");
  }

  return session;
}

/** `POST {NEON_AUTH_BASE_URL}/sign-out` — best-effort; an already-expired session is not an error. */
export async function signOut(token: string): Promise<void> {
  const response = await safeFetch(`${baseUrl()}/sign-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: originHeader(),
      Cookie: `${sessionCookieName()}=${token}`
    },
    body: "{}"
  });

  if (!response.ok && response.status !== 401 && response.status !== 403) {
    throw new ApiError(502, "auth_upstream_error", "Auth service error.");
  }
}

/** `POST {NEON_AUTH_BASE_URL}/sign-up/email` — used only by scripts/create-editor.ts, never by the CMS. */
export async function signUpWithEmail(email: string, password: string, name: string): Promise<NeonAuthUpstreamUser> {
  const response = await safeFetch(`${baseUrl()}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: originHeader() },
    body: JSON.stringify({ email, password, name })
  });

  if (!response.ok) {
    if (response.status >= 500) {
      throw new ApiError(502, "auth_upstream_error", "Auth service error.");
    }
    const message = await response.text().catch(() => "");
    throw new ApiError(response.status, "sign_up_failed", message || "Sign-up failed.");
  }

  const payload = (await response.json().catch(() => ({}))) as { user?: NeonAuthUpstreamUser };
  if (!payload.user?.id) {
    throw new ApiError(502, "auth_upstream_error", "Auth service did not return a user.");
  }

  return payload.user;
}
