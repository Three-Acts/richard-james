/**
 * Editor auth contract between the CMS and `apps/api` (`/api/auth/*`). The
 * API brokers every call to the identity provider (Neon Auth today) so the
 * CMS never talks to it directly; swapping providers touches `apps/api` only.
 *
 *   POST /api/auth/sign-in   body SignInBody             -> AuthSession
 *   GET  /api/auth/session   Authorization: Bearer <tok> -> AuthSession (401 when invalid or expired)
 *   POST /api/auth/sign-out  Authorization: Bearer <tok> -> { signedOut: true }
 */

export type SignInBody = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  /** Bearer token the CMS sends on every `/api/cms/*` and `/api/deploy*` call. */
  token: string;
  /** ISO 8601 UTC expiry of `token`. */
  expiresAt: string;
  user: AuthUser;
};

export const authApiPaths = {
  signIn: () => "/auth/sign-in" as const,
  session: () => "/auth/session" as const,
  signOut: () => "/auth/sign-out" as const
};
