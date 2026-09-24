export type ApiEnvelope<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export type ApiClientOptions = {
  /** Defaults to "/api". An empty string is treated the same as "unset". */
  baseUrl?: string;
  /** Called on every request; return a token to attach `Authorization: Bearer <token>`. */
  getAuthToken?: () => Promise<string | null> | string | null;
  /** Abort a request that takes longer than this. Defaults to 20s. */
  timeoutMs?: number;
};

export type ApiRequestErrorKind = "network" | "timeout" | "unreadable" | "api";

/**
 * Every failure from `apiFetch` is one of these, so callers can branch on
 * `kind`, the envelope `code`, and the HTTP `status` instead of parsing
 * messages. `code` is the envelope's error code for `kind === "api"` and a
 * fixed value (`network_error`, `timeout`, `unreadable_response`) otherwise.
 */
export class ApiRequestError extends Error {
  readonly kind: ApiRequestErrorKind;
  readonly code: string;
  readonly status?: number;

  constructor(kind: ApiRequestErrorKind, code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.kind = kind;
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "/api";
const DEFAULT_TIMEOUT_MS = 20_000;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

function hasHeader(headers: Record<string, string>, name: string) {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

/**
 * Builds a small, dependency-free API client bound to a base URL. Shared by
 * every app so the same-origin `/api/*` convention, envelope parsing, and
 * error messages stay identical across the web app and the CMS.
 */
export function createApiClient(options: ApiClientOptions = {}) {
  // An empty string is what an unset Vite/Astro env var resolves to at build
  // time, so treat it the same as "unset" rather than requesting a blank
  // base URL.
  const apiBaseUrl = trimTrailingSlash(options.baseUrl || DEFAULT_BASE_URL);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const apiUrl = (path: `/${string}`) => `${apiBaseUrl}${path}`;

  async function apiFetch<TData>(path: `/${string}`, init?: RequestInit): Promise<TData> {
    const token = options.getAuthToken ? await options.getAuthToken() : null;
    const controller = new AbortController();

    // Respect a caller-supplied signal in addition to our own timeout, so
    // aborting from outside still works.
    if (init?.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined)
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (typeof init?.body === "string" && !hasHeader(headers, "Content-Type")) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;

    try {
      // Spread `init` first so our carefully-merged `headers` (and the abort
      // `signal`) always win instead of being clobbered by `init`'s own keys.
      response = await fetch(apiUrl(path), {
        ...init,
        headers,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiRequestError("timeout", "timeout", `The API did not respond within ${timeoutMs}ms.`);
      }

      // Offline, DNS failure, CORS, connection refused: the request never completed.
      throw new ApiRequestError("network", "network_error", error instanceof Error ? error.message : "The API is unavailable.");
    } finally {
      clearTimeout(timeoutId);
    }

    let payload: ApiEnvelope<TData>;

    try {
      payload = (await response.json()) as ApiEnvelope<TData>;
    } catch {
      // A non-JSON body means nothing handled the request — usually the API is
      // not running. Report that instead of leaking the JSON parser's own error.
      throw new ApiRequestError(
        "unreadable",
        "unreadable_response",
        `The API returned an unreadable response (${response.status}). Check that the API server is running.`,
        response.status
      );
    }

    if (!response.ok || !payload.ok) {
      const code = payload.ok === false ? payload.error.code : "request_failed";
      const message = payload.ok === false ? payload.error.message : "API request failed.";
      throw new ApiRequestError("api", code, message, response.status);
    }

    return payload.data;
  }

  return { apiBaseUrl, apiUrl, apiFetch };
}
