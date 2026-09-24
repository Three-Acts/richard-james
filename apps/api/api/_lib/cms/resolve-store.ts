import { NeonBlobStore } from "./neon-blob-store";
import { NeonDataStore } from "./neon-store";
import type { CmsBlobStore, CmsDataStore } from "./store";

/**
 * Neon is the only backend: no local/in-memory fallback exists. Constructing
 * these doesn't itself touch env — `NeonDataStore`/`NeonBlobStore` only
 * require `DATABASE_URL`/`AWS_ENDPOINT_URL_S3` (and friends) the first time a
 * method actually runs a query or hits the object store (see `getPool` in
 * `../db` and `getClient` in `./neon-blob-store`), each raising a clear
 * `CmsError("unavailable", ...)` naming the missing variable at that point.
 */
let cachedDataStore: CmsDataStore | undefined;
let cachedBlobStore: CmsBlobStore | undefined;

export function getDataStore(): CmsDataStore {
  if (!cachedDataStore) {
    cachedDataStore = new NeonDataStore();
  }
  return cachedDataStore;
}

export function getBlobStore(): CmsBlobStore {
  if (!cachedBlobStore) {
    cachedBlobStore = new NeonBlobStore();
  }
  return cachedBlobStore;
}
