import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const port = Number(process.env.PORT ?? 5175);
const host = process.env.HOST ?? "0.0.0.0";

const routes = {
  "/api/health": () => import("../api/health"),
  "/api/meta": () => import("../api/meta")
} satisfies Record<
  string,
  () => Promise<{ default: (request: VercelRequest, response: VercelResponse) => unknown }>
>;

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
  const loadRoute = routes[requestUrl.pathname as keyof typeof routes];

  if (!loadRoute) {
    outgoingResponse.statusCode = 404;
    outgoingResponse.setHeader("Content-Type", "application/json; charset=utf-8");
    outgoingResponse.end(
      JSON.stringify({
        ok: false,
        error: {
          code: "not_found",
          message: "API route not found."
        }
      })
    );
    return;
  }

  const body = await readBody(incomingRequest);
  const request = {
    ...incomingRequest,
    body,
    headers: incomingRequest.headers,
    method: incomingRequest.method,
    query: Object.fromEntries(requestUrl.searchParams),
    url: incomingRequest.url,
    cookies: {}
  } as unknown as VercelRequest;
  const response = createVercelResponse(outgoingResponse);
  const route = await loadRoute();

  await route.default(request, response);
});

server.listen(port, host, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
