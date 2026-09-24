import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isCmsError } from "@three-acts/cms-schema";
import { applyCors, handleOptions } from "./cors";
import { getDbTimingMs, withDbTiming } from "./server-timing";

export type ApiSuccess<TData> = {
  ok: true;
  data: TData;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export type ApiHandler = (
  request: VercelRequest,
  response: VercelResponse
) => void | Promise<void>;

/**
 * Intentional, client-facing API error. Handlers and `_lib` helpers throw
 * this for expected failure cases (validation, auth, unconfigured
 * dependencies); `withApi` surfaces its `status`/`code`/`message` as-is.
 * Anything else thrown is treated as a bug: logged server-side and reported
 * to the client as a generic message so internals never leak.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const json = <TData>(
  response: VercelResponse,
  status: number,
  body: ApiResponse<TData>
) => {
  // Set before the body is written (that ends the response). `getDbTimingMs`
  // reads the current request's accumulator (see `withApi` below), which is
  // undefined outside a timed request — i.e. no header on non-/api/cms/* routes.
  const dbMs = getDbTimingMs();
  if (dbMs !== undefined) {
    response.setHeader("Server-Timing", `db;dur=${dbMs.toFixed(1)}`);
  }
  response.status(status).json(body);
};

export const ok = <TData>(response: VercelResponse, data: TData) => {
  json(response, 200, { ok: true, data });
};

export const error = (
  response: VercelResponse,
  status: number,
  code: string,
  message: string
) => {
  json(response, status, {
    ok: false,
    error: { code, message }
  });
};

/**
 * Translates a `CmsError` (thrown by `cms/service.ts` and the store layer)
 * into the `ApiError` `withApi` already knows how to render. Anything else is
 * returned as-is so the caller's normal unknown-error handling still applies.
 */
export const toApiError = (caughtError: unknown): unknown => {
  if (isCmsError(caughtError)) {
    return new ApiError(caughtError.status, caughtError.code, caughtError.message);
  }
  return caughtError;
};

export const withApi = (
  methods: string[],
  handler: ApiHandler
): ApiHandler => {
  return async (request, response) => {
    if (handleOptions(request, response)) {
      return;
    }

    applyCors(request, response);

    if (!request.method || !methods.includes(request.method)) {
      response.setHeader("Allow", [...methods, "OPTIONS"].join(", "));
      error(response, 405, "method_not_allowed", "Method not allowed.");
      return;
    }

    const runHandler = async () => {
      try {
        await handler(request, response);
      } catch (caughtError) {
        if (response.headersSent) {
          console.error(caughtError);
          return;
        }

        const normalizedError = caughtError instanceof ApiError ? caughtError : toApiError(caughtError);

        if (normalizedError instanceof ApiError) {
          error(response, normalizedError.status, normalizedError.code, normalizedError.message);
          return;
        }

        console.error(caughtError);
        error(response, 500, "internal_server_error", "Unexpected API error.");
      }
    };

    // DB timing (surfaced as `Server-Timing: db;dur=…`, see server-timing.ts
    // and `json` above) is only measured for /api/cms/* — the routes backed
    // by the CmsDataStore, where "how much of this was Postgres" is the
    // useful diagnostic. request.url is the path as invoked (with query
    // string), matching how scripts/dev-server.ts routes requests.
    const path = (request.url ?? "").split("?")[0];
    if (path.startsWith("/api/cms")) {
      // Editor data is per-request and auth-gated — never cache it. No CMS
      // route sets its own Cache-Control (unlike /api/content/*, which sets
      // a public s-maxage), so this always applies here.
      if (!response.getHeader("Cache-Control")) {
        response.setHeader("Cache-Control", "no-store");
      }
      await withDbTiming(runHandler);
    } else {
      await runHandler();
    }
  };
};

/**
 * Parses a request body that may arrive as an already-parsed object (Vercel's
 * default JSON parsing) or as a raw string (the local dev server, or a client
 * that sent a body without a recognized Content-Type).
 */
export const readJsonBody = <TBody>(request: VercelRequest): TBody => {
  const body = request.body;

  if (body === undefined || body === null || body === "") {
    return {} as TBody;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as TBody;
    } catch {
      throw new ApiError(400, "invalid_json", "Request body is not valid JSON.");
    }
  }

  if (typeof body === "object") {
    return body as TBody;
  }

  throw new ApiError(400, "invalid_json", "Request body is not valid JSON.");
};
