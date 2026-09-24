import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dispatch } from "../api/_lib/router";
import { loadEnvFiles } from "./load-env";

const __dirname = dirname(fileURLToPath(import.meta.url));

// apps/api/.env.local: live Neon branch vars written by `neon env pull`
// plus the hand-added app-local keys (see apps/api/.env.example).
loadEnvFiles([resolve(__dirname, "../.env.local")]);

const port = Number(process.env.PORT ?? 5175);
const host = process.env.HOST ?? "0.0.0.0";

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return undefined;
  }

  if (request.headers["content-type"]?.includes("application/json")) {
    return JSON.parse(rawBody) as unknown;
  }

  return rawBody;
};

/**
 * `URLSearchParams` -> query object, keeping repeated keys as arrays the way
 * Vercel's own request.query does (`Object.fromEntries` would silently drop
 * all but the last value for a repeated key).
 */
const buildQuery = (searchParams: URLSearchParams): Record<string, string | string[]> => {
  const query: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }

  return query;
};

const createVercelResponse = (response: ServerResponse) => {
  const vercelResponse = {
    status(statusCode: number) {
      response.statusCode = statusCode;
      return vercelResponse;
    },
    setHeader(name: string, value: number | string | readonly string[]) {
      response.setHeader(name, value);
      return vercelResponse;
    },
    getHeader(name: string) {
      return response.getHeader(name);
    },
    json(body: unknown) {
      if (!response.hasHeader("Content-Type")) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
      }

      response.end(JSON.stringify(body));
      return vercelResponse;
    },
    end(body?: string) {
      response.end(body);
      return vercelResponse;
    }
  };

  return vercelResponse as unknown as VercelResponse;
};

const server = createServer(async (incomingRequest, outgoingResponse) => {
  const requestUrl = new URL(
    incomingRequest.url ?? "/",
    `http://${incomingRequest.headers.host ?? `${host}:${port}`}`
  );

  try {
    const body = await readBody(incomingRequest);
    const request = {
      ...incomingRequest,
      body,
      headers: incomingRequest.headers,
      method: incomingRequest.method,
      query: buildQuery(requestUrl.searchParams),
      url: incomingRequest.url,
      cookies: {}
    } as unknown as VercelRequest;
    const response = createVercelResponse(outgoingResponse);

    // Same route table + matching semantics as the single Vercel function
    // (api/[...path].ts) dispatches to — see api/_lib/router.ts.
    await dispatch(request, response, requestUrl.pathname);
  } catch (caughtError) {
    if (outgoingResponse.headersSent) {
      console.error(caughtError);
      return;
    }

    outgoingResponse.setHeader("Content-Type", "application/json; charset=utf-8");

    if (caughtError instanceof SyntaxError) {
      outgoingResponse.statusCode = 400;
      outgoingResponse.end(
        JSON.stringify({
          ok: false,
          error: {
            code: "invalid_json",
            message: "Request body is not valid JSON."
          }
        })
      );
      return;
    }

    console.error(caughtError);
    outgoingResponse.statusCode = 500;
    outgoingResponse.end(
      JSON.stringify({
        ok: false,
        error: {
          code: "internal_server_error",
          message: "Unexpected API error."
        }
      })
    );
  }
});

server.listen(port, host, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
