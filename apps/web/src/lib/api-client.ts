import { createApiClient, type ApiEnvelope } from "@three-acts/utils/api-client";

/**
 * Web app's bound API client. `PUBLIC_API_URL` is the only env-driven knob:
 * Astro (like Vite) only exposes `PUBLIC_`-prefixed vars to client-side code,
 * so this must not be `VITE_`-prefixed or it is always undefined in the
 * hydrated bundle. Unset, it falls back to the same-origin `/api` convention
 * (proxied in dev, rewritten in Vercel — see astro.config.mjs / vercel.ts).
 */
const client = createApiClient({ baseUrl: import.meta.env.PUBLIC_API_URL });

export const apiUrl = client.apiUrl;
export const apiFetch = client.apiFetch;
export type { ApiEnvelope };
