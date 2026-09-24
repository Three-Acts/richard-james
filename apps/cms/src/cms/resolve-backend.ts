import { apiFetch } from "../lib/api-client";
import { mockCmsBackend } from "./mock-adapter";
import { createRestCmsBackend } from "./rest-backend";
import type { CmsBackend } from "./types";

/**
 * Picks the active `CmsBackend` from `VITE_CMS_BACKEND`:
 * - unset or "mock" (the default): the in-memory mock backend.
 * - "rest": the REST backend, talking to `/api/cms/*` via the CMS `apiFetch`.
 * - anything else: warns and falls back to mock so local dev never hard-fails
 *   on a typo'd env var.
 */
export function resolveCmsBackend(): CmsBackend {
  const value = import.meta.env.VITE_CMS_BACKEND;

  if (!value || value === "mock") {
    return mockCmsBackend;
  }

  if (value === "rest") {
    return createRestCmsBackend({ apiFetch });
  }

  console.warn(`Unknown VITE_CMS_BACKEND "${value}" — falling back to the mock backend.`);
  return mockCmsBackend;
}
