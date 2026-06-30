import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions } from "./cors";

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

export const json = <TData>(
  response: VercelResponse,
  status: number,
  body: ApiResponse<TData>
) => {
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

    try {
      await handler(request, response);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unexpected API error.";

      error(response, 500, "internal_server_error", message);
    }
  };
};
