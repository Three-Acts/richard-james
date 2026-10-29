import assert from "node:assert/strict";
import { test } from "node:test";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import mediaRoute from "../_routes/cms/tutorials/[tutorialId]/media.js";
import { createTutorialMediaUrls } from "./tutorial-media.js";

function mockRequest(input: { tutorialId?: string; authorization?: string; includeSrt?: string }) {
  return {
    method: "GET",
    url: `/api/cms/tutorials/${input.tutorialId ?? "01"}/media`,
    query: {
      ...(input.tutorialId ? { tutorialId: input.tutorialId } : {}),
      ...(input.includeSrt ? { includeSrt: input.includeSrt } : {})
    },
    headers: { ...(input.authorization ? { authorization: input.authorization } : {}) }
  } as unknown as VercelRequest;
}

function mockResponse() {
  const headers = new Map<string, string>();
  const result: { statusCode?: number; body?: unknown; headers: Map<string, string> } = { headers };
  let headersSent = false;
  const response = {
    get headersSent() { return headersSent; },
    setHeader(name: string, value: string) { headers.set(name, value); return response; },
    getHeader(name: string) { return headers.get(name); },
    status(code: number) { result.statusCode = code; return response; },
    json(body: unknown) { result.body = body; headersSent = true; return response; },
    end() { headersSent = true; return response; }
  } as unknown as VercelResponse;
  return { response, result };
}

function responseData(result: ReturnType<typeof mockResponse>["result"]): Record<string, unknown> | undefined {
  return (result.body as { data?: Record<string, unknown> } | undefined)?.data;
}

test("private tutorial media rejects missing, invalid, and service-only credentials", async () => {
  process.env.PUBLISH_TOKEN = "publish-service-token";
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.test";

  const missing = mockResponse();
  await mediaRoute(mockRequest({}), missing.response);
  assert.equal(missing.result.statusCode, 401);
  assert.equal(missing.result.headers.get("Cache-Control"), "no-store");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 401 })) as typeof fetch;
  try {
    const invalid = mockResponse();
    await mediaRoute(mockRequest({ authorization: "Bearer expired-editor-session" }), invalid.response);
    assert.equal(invalid.result.statusCode, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }

  delete process.env.NEON_AUTH_BASE_URL;
  const serviceOnly = mockResponse();
  await mediaRoute(mockRequest({ authorization: "Bearer publish-service-token" }), serviceOnly.response);
  assert.equal(serviceOnly.result.statusCode, 401);
});

test("a live Neon editor session receives short-lived URLs for fixed private keys only", async () => {
  process.env.PUBLISH_TOKEN = "publish-service-token";
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.test";
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.test";
  process.env.AWS_REGION = "us-east-2";
  process.env.AWS_ACCESS_KEY_ID = "test-access-key";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.CMS_TUTORIALS_PREFIX = "v2026-10-29-test";

  const originalFetch = globalThis.fetch;
  let requestedCookie: string | null = null;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requestedCookie = new Headers(init?.headers).get("Cookie");
    return new Response(JSON.stringify({
      session: { token: "mocked-editor-session", expiresAt: new Date(Date.now() + 60_000).toISOString() },
      user: { id: "editor-1", email: "editor@example.test", name: "CMS Editor" }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  const { response, result } = mockResponse();
  try {
    await mediaRoute(mockRequest({ tutorialId: "01", includeSrt: "true", authorization: "Bearer mocked-editor-session" }), response);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(result.statusCode, 200);
  assert.equal(requestedCookie, "__Secure-neon-auth.session_token=mocked-editor-session");
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  const data = responseData(result)!;
  assert.equal(typeof data.expiresAt, "number");
  assert.equal(typeof data.srt, "string");
  const videoUrl = new URL(String(data.video));
  assert.equal(videoUrl.pathname, "/cms-tutorials/v2026-10-29-test/videos/01-sign-in.mp4");
  assert.equal(videoUrl.searchParams.get("X-Amz-Expires"), "300");
  const downloadUrl = new URL(String(data.word));
  assert.equal(downloadUrl.pathname, "/cms-tutorials/v2026-10-29-test/Richard-James-CMS-User-Guide.docx");
  assert.equal(downloadUrl.searchParams.get("response-content-disposition"), 'attachment; filename="Richard-James-CMS-User-Guide.docx"');
  assert.equal(new URL(String(data.video)).searchParams.has("response-content-disposition"), false);
});

test("unknown tutorial IDs and unsafe configured prefixes never become object keys", async () => {
  process.env.CMS_TUTORIALS_PREFIX = "v2026-10-29-test";
  await assert.rejects(createTutorialMediaUrls("../../private"), { code: "tutorial_not_found", status: 404 });
  process.env.CMS_TUTORIALS_PREFIX = "release/private";
  await assert.rejects(createTutorialMediaUrls("01"), { code: "tutorials_unconfigured", status: 503 });
});

test("the production default selects the uploaded immutable version without new deployment config", async () => {
  delete process.env.CMS_TUTORIALS_PREFIX;
  const media = await createTutorialMediaUrls("21");
  assert.equal(new URL(media.video).pathname, "/cms-tutorials/v2026-10-29/videos/21-discard-and-sign-out.mp4");
});
