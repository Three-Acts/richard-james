import { createApiClient } from "@three-acts/utils";
import type { ApiEnvelope } from "@three-acts/utils";

export type { ApiEnvelope };

type ApiClientConfig = {
  getAuthToken: () => Promise<string | null>;
};

let getAuthToken: ApiClientConfig["getAuthToken"] = async () => null;

/**
 * Wires apiFetch up to the active auth client's token getter so every
 * request carries the current session's bearer token without every call
 * site having to thread it through. AuthProvider calls this once it knows
 * which AuthClient is active.
 *
 * This indirection (a module-level variable read lazily by the client below)
 * exists because `createApiClient` captures `getAuthToken` once, at
 * construction time, but AuthProvider only learns the real token getter after
 * mount.
 */
export function configureApiClient(config: ApiClientConfig) {
  getAuthToken = config.getAuthToken;
}

// An empty string is what an unset Vite env var resolves to at build time;
// `createApiClient` already treats that the same as "unset" and falls back
// to "/api".
const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken: () => getAuthToken()
});

export const apiBaseUrl = client.apiBaseUrl;
export const apiUrl = client.apiUrl;

/**
 * The CMS's bound `apiFetch`. Failures are `ApiRequestError`s from
 * `@three-acts/utils`, carrying the envelope `code` and HTTP `status`.
 */
export const apiFetch: <TData>(path: `/${string}`, init?: RequestInit) => Promise<TData> = client.apiFetch;
