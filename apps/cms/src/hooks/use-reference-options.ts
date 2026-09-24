import { useEffect, useSyncExternalStore } from "react";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import { findCollection } from "../cms/types";
import type { CmsBackend } from "../cms/types";

export type ReferenceOption = { label: string; value: string };

type CacheStatus = "loading" | "ready" | "error";

type CacheEntry = {
  status: CacheStatus;
  options: ReferenceOption[];
  labelById: Map<string, string>;
  error: string | null;
  /** `Date.now()` of the last failed fetch — gates automatic retries. */
  failedAt?: number;
};

/** How long an "error" entry is left alone before it's eligible for a retry. */
const RETRY_AFTER_MS = 5000;

/**
 * One entry per referenced collection id, shared by every field/column that
 * references it. Populated lazily on first read through the active backend's
 * `listRecords`, sorted by the referenced collection's `titleField`.
 */
const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

/**
 * Drops a collection's cached reference options so the next read re-fetches.
 * Call after a save/create/delete/import on that collection — see
 * `use-cms-workspace.ts`.
 */
export function bumpReferenceCache(collectionId: string) {
  if (cache.delete(collectionId)) {
    notify();
  }
}

function ensureLoaded(backend: CmsBackend, collectionId: string) {
  const existing = cache.get(collectionId);

  if (existing) {
    // A "loading" or "ready" entry needs no new fetch. An "error" entry is
    // left alone briefly (so a failed collection doesn't hot-loop retries on
    // every render) but is otherwise treated as missing so it eventually
    // recovers on its own, rather than staying blank forever.
    const isStaleError = existing.status === "error" && Date.now() - (existing.failedAt ?? 0) > RETRY_AFTER_MS;

    if (!isStaleError) {
      return;
    }
  }

  const collection = findCollection(collectionId);
  const titleField = collection?.titleField ?? "id";

  // Placeholder so a second caller in the same tick doesn't kick off a
  // duplicate request while this one is in flight. Keep whatever options were
  // already known (from a previous success, or a previous failed retry) so a
  // transient re-fetch never blanks a working Select/column.
  cache.set(collectionId, {
    status: "loading",
    options: existing?.options ?? [],
    labelById: existing?.labelById ?? new Map(),
    error: null
  });

  backend.data
    .listRecords(collectionId, { limit: 500, sort: { key: titleField, direction: "asc" } })
    .then(({ records }) => {
      const options = records.map((record) => ({
        label: String(record.values[titleField] || record.id),
        value: record.id
      }));
      const labelById = new Map(options.map((option) => [option.value, option.label] as const));
      cache.set(collectionId, { status: "ready", options, labelById, error: null });
      notify();
    })
    .catch((error: unknown) => {
      // Preserve the last-known-good options/labels instead of discarding
      // them: a transient failure (e.g. after `bumpReferenceCache` forces a
      // reload) should degrade to stale-but-usable data, not an empty list.
      const prev = cache.get(collectionId);
      cache.set(collectionId, {
        status: "error",
        options: prev?.options ?? [],
        labelById: prev?.labelById ?? new Map(),
        error: describeCmsError(error),
        failedAt: Date.now()
      });
      notify();
    });
}

function getEntry(collectionId: string): CacheEntry | undefined {
  return cache.get(collectionId);
}

/** Re-renders the caller whenever any collection's cached reference options change. */
function useReferenceCacheVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/**
 * Loads `collectionId`'s records as select options (label = its titleField
 * value, value = record id) through the active backend, for a `reference`
 * field's editor control. Backed by the shared module-level cache above.
 */
export function useReferenceOptions(collectionId: string): {
  options: ReferenceOption[];
  isLoading: boolean;
  error: string | null;
} {
  const backend = useCmsBackend();
  useReferenceCacheVersion();

  // No dependency array: runs after every render, but `ensureLoaded` is a
  // cheap no-op unless the entry is missing or a stale "error" — that's what
  // lets a failed collection recover on its own once enough time has passed,
  // instead of being stuck empty until an unrelated remount.
  useEffect(() => {
    ensureLoaded(backend, collectionId);
  });

  const entry = getEntry(collectionId);

  return {
    options: entry?.options ?? [],
    isLoading: !entry || entry.status === "loading",
    error: entry?.status === "error" ? entry.error : null
  };
}

/**
 * Resolves reference values to their referenced record's title for a table
 * column, without re-fetching per row. `collectionIds` should be a stable
 * (e.g. memoized) array — see `RecordTable`.
 */
export function useReferenceLookup(collectionIds: string[]): {
  resolveLabel: (collectionId: string, recordId: string) => string | undefined;
} {
  const backend = useCmsBackend();
  // Forces this component to re-render (and so re-read the cache below) once
  // a lookup that was still loading resolves.
  useReferenceCacheVersion();

  // Same reasoning as `useReferenceOptions`: no dependency array so a stale
  // "error" entry gets retried on a later render instead of staying empty.
  useEffect(() => {
    collectionIds.forEach((collectionId) => ensureLoaded(backend, collectionId));
  });

  return {
    resolveLabel(collectionId: string, recordId: string) {
      return getEntry(collectionId)?.labelById.get(recordId);
    }
  };
}
