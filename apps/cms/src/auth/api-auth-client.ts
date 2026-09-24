import { ApiRequestError } from "@three-acts/utils";
import { authApiPaths, type AuthSession, type AuthUser as ContractAuthUser } from "@three-acts/cms-schema";
import { apiFetch } from "../lib/api-client";
import type { AuthClient, AuthUser, SignInCredentials } from "./auth-context";

/**
 * `AuthClient` backed by `apps/api`'s `/api/auth/*` bridge to Neon Auth (see
 * `auth-contract.ts` in `@three-acts/cms-schema` and spec §4). Neon Auth
 * session cookies expire after 15 minutes, so the CMS never holds a real JWT
 * — `token` here is the opaque session value the API hands back, stored
 * client-side and sent as a bearer token on every `/api/*` call.
 */

const STORAGE_KEY = "cms.session";

type StoredSession = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;

    if (!parsed || !parsed.token || !parsed.expiresAt || !parsed.user) {
      return null;
    }

    return { token: parsed.token, expiresAt: parsed.expiresAt, user: parsed.user };
  } catch {
    // Unavailable storage (private browsing, quota) or corrupt JSON: behave
    // as if there's no session rather than throwing during app start-up.
    return null;
  }
}

function writeStoredSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The session still works for the rest of this page load via in-memory
    // auth state; it just won't survive a reload.
  }
}

function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

function isExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  return Number.isNaN(expiry) || expiry <= Date.now();
}

// auth-contract's AuthUser and auth-context's AuthUser are structurally
// identical (id, name, email); this makes the mapping explicit at the
// boundary rather than relying on that staying true by accident.
function toAuthUser(user: ContractAuthUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email };
}

function describeSignInError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.kind === "unreadable") {
      // A non-JSON response usually means /api/* hit the CMS dev server
      // itself (a 404 HTML page), not the API — most often API_ORIGIN is
      // unset or the API isn't running. The message already says as much;
      // point at the specific env var too.
      return `${error.message} Check API_ORIGIN in apps/cms/.env.`;
    }

    if (error.kind !== "api") {
      // network / timeout: the API never gave us a usable answer.
      return "The sign-in service is unavailable.";
    }

    if (error.status === 401 || error.code === "invalid_credentials") {
      return "Incorrect email or password.";
    }

    if (error.status === 502 || error.status === 503) {
      return "The sign-in service is unavailable.";
    }

    return error.message || "Sign-in failed.";
  }

  return error instanceof Error ? error.message : "Sign-in failed.";
}

export const apiAuthClient: AuthClient = {
  async getCurrentUser() {
    const stored = readStoredSession();

    if (!stored) {
      return null;
    }

    if (isExpired(stored.expiresAt)) {
      clearStoredSession();
      return null;
    }

    try {
      // `apiFetch` already attaches this stored token as the bearer token
      // (see `AuthProvider`'s `configureApiClient` wiring), so no explicit
      // Authorization header is needed here.
      const session = await apiFetch<AuthSession>(authApiPaths.session());
      const user = toAuthUser(session.user);
      writeStoredSession({ token: session.token, expiresAt: session.expiresAt, user });
      return user;
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "api" && error.status === 401) {
        clearStoredSession();
      }
      // A transient network failure shouldn't sign the editor out mid-outage;
      // just don't restore a session for this page load.
      return null;
    }
  },

  async getAccessToken() {
    const stored = readStoredSession();

    if (!stored || isExpired(stored.expiresAt)) {
      return null;
    }

    return stored.token;
  },

  async signIn({ email, password }: SignInCredentials) {
    try {
      const session = await apiFetch<AuthSession>(authApiPaths.signIn(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const user = toAuthUser(session.user);
      writeStoredSession({ token: session.token, expiresAt: session.expiresAt, user });
      return user;
    } catch (error) {
      throw new Error(describeSignInError(error));
    }
  },

  async signOut() {
    try {
      // Sent while the session is still in storage so `apiFetch` attaches it
      // as the bearer token; sign-out is best-effort either way.
      await apiFetch(authApiPaths.signOut(), { method: "POST" });
    } catch {
      // The CMS forgets the session locally regardless — that's what the UI
      // actually depends on.
    } finally {
      clearStoredSession();
    }
  }
};
