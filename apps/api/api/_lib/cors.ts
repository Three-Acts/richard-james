import type { VercelRequest, VercelResponse } from "@vercel/node";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
];

const getAllowedOrigins = () => {
  const configuredOrigins = process.env.API_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : defaultAllowedOrigins;
};

export const applyCors = (
  request: VercelRequest,
  response: VercelResponse
) => {
  const origin = request.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin =
    origin &&
    (allowedOrigins.includes("*") || allowedOrigins.includes(origin));

  if (isAllowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export const handleOptions = (
  request: VercelRequest,
  response: VercelResponse
) => {
  applyCors(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return true;
  }

  return false;
};
