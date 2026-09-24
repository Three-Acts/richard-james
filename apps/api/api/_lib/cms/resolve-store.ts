import { MemoryBlobStore, MemoryDataStore } from "./memory-store";
import { SupabaseBlobStore, SupabaseDataStore } from "./supabase-store";
import type { CmsBlobStore, CmsDataStore } from "./store";

type BackendName = "supabase" | "memory";

/**
 * Picks the backend for `CMS_DATA_BACKEND` / `CMS_STORAGE_BACKEND`:
 * - "supabase" or "memory" picks that backend explicitly.
 * - unset defaults to "supabase" when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   are both configured, otherwise "memory" (so local dev works with zero
 *   external services).
 */
function resolveBackendName(envValue: string | undefined): BackendName {
  if (envValue === "supabase" || envValue === "memory") {
    return envValue;
  }

  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return supabaseConfigured ? "supabase" : "memory";
}

let cachedDataStore: CmsDataStore | undefined;
let cachedBlobStore: CmsBlobStore | undefined;

export function getDataStore(): CmsDataStore {
  if (!cachedDataStore) {
    const backend = resolveBackendName(process.env.CMS_DATA_BACKEND);
    cachedDataStore = backend === "supabase" ? new SupabaseDataStore() : new MemoryDataStore();
    console.info(`[cms] data backend: ${cachedDataStore.name}`);
  }

  return cachedDataStore;
}

export function getBlobStore(): CmsBlobStore {
  if (!cachedBlobStore) {
    const backend = resolveBackendName(process.env.CMS_STORAGE_BACKEND);
    cachedBlobStore = backend === "supabase" ? new SupabaseBlobStore() : new MemoryBlobStore();
    console.info(`[cms] storage backend: ${cachedBlobStore.name}`);
  }

  return cachedBlobStore;
}
