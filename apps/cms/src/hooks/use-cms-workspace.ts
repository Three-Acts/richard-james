import { useEffect, useMemo, useRef, useState } from "react";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import { collectionRegistry } from "../cms/registry";
import type {
  AssetField,
  AssetUploadResult,
  CmsCollectionSummary,
  CmsRecord,
  CmsRecordValue,
  GalleryField,
  ListRecordsResult,
  PublishStatus
} from "../cms/types";
import { MAX_ASSET_UPLOAD_BYTES, parseGalleryValue, serializeGalleryValue } from "../cms/types";
import { rememberAssetMeta, useToast } from "../components/atoms";
import type { GalleryOptimizeProgress, UploadProgress } from "../components/editor/field-control";
import type { CollectionGroup } from "../components/workspace";
import { areValuesEqual, assertNoBlobUrls, getRecordTitle, replaceBlobUrlsForKeys, stripBlobUrls } from "../lib/records";
import { exportRecords } from "../lib/export-records";
import { looksLikeImage, optimizeImage } from "../lib/optimize-image";
import { bumpReferenceCache } from "./use-reference-options";

/** How many files optimise (client-side) or upload (on Save) at once — fast enough to feel instant, gentle enough not to saturate the connection. */
const GALLERY_PROCESS_CONCURRENCY = 3;
const UPLOAD_CONCURRENCY = 3;

type PendingUpload = { file: File; fieldKey: string; fileName: string; size: number };

/**
 * Surfaces a write-action failure as its own error toast (title names the
 * action, description is `describeCmsError`'s message — e.g. the `conflict`
 * copy that tells the editor to reload). Kept separate from the generic
 * `error` state below, which still drives a toast for passive load failures
 * (initial collection/record fetches) — see `CmsWorkspace`'s effect.
 */
function pushActionErrorToast(toast: ReturnType<typeof useToast>, title: string, error: unknown) {
  toast.push({ tone: "error", title, description: describeCmsError(error), duration: 8000 });
}

export function useCmsWorkspace() {
  const { data, storage } = useCmsBackend();
  const toast = useToast();
  const [collections, setCollections] = useState<CmsCollectionSummary[]>([]);
  // The static registry (bundled at build time, no network round trip) already
  // knows the first collection's id, so the records fetch below can start
  // immediately instead of waiting on `listCollections` to resolve first —
  // that wait was a real, avoidable waterfall (collections, *then* records).
  const [activeCollectionId, setActiveCollectionId] = useState(() => collectionRegistry[0]?.id ?? "");
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  // Raw, async-driven state: whatever was last fetched/created/saved, whether
  // or not it still matches `selectedRecordId`. The publicly exposed
  // `draftRecord` (derived below) is what the UI should actually show.
  const [draftRecordState, setDraftRecordState] = useState<CmsRecord | null>(null);
  // The last record snapshot known to be saved on the server. Compared
  // against the draft to derive `isDirty` — never mutated by `updateDraftValue`.
  const [lastSavedRecordState, setLastSavedRecordState] = useState<CmsRecord | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(() => collectionRegistry.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Optimizing" — client-side decode/resize/re-encode right after a file is
  // picked/dropped. No network call has happened yet at this point; see
  // `pendingUploadsRef` below for the files staged as a result, and
  // `uploadProgress` for the *actual* network phase that happens on Save.
  const [optimizingField, setOptimizingField] = useState<string | null>(null);
  const [galleryOptimizing, setGalleryOptimizing] = useState<GalleryOptimizeProgress>(null);
  // Files staged (as a `blob:` object URL already sitting in the draft's
  // values) but not yet uploaded — populated by `handleAssetUpload`/
  // `handleGalleryUpload` below, consumed and cleared by `handleSaveRecord`.
  // A plain ref, not state: nothing renders its *contents* directly (only
  // whether a given value/src happens to start with "blob:", which the
  // field controls check themselves), so mutating it doesn't need to
  // trigger a re-render on its own — the draft value change that comes
  // with every mutation already does that.
  const pendingUploadsRef = useRef<Map<string, PendingUpload>>(new Map());
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);

  // In-flight request caches for the two mount-time fetches below. A
  // StrictMode dev double-invoke runs the same effect twice back to back,
  // before either's async work has settled, so an `isMounted` flag alone
  // (which only discards the first invocation's *result*) doesn't stop the
  // second invocation from firing its own duplicate network request. Reusing
  // the still-pending promise here does: the second invocation awaits the
  // exact same request instead of starting a new one.
  const collectionsRequestRef = useRef<Promise<CmsCollectionSummary[]> | null>(null);
  const recordsRequestRef = useRef<{ collectionId: string; promise: Promise<ListRecordsResult> } | null>(null);

  // Collections and the active collection's records are fetched in parallel
  // (both effects run after the same initial commit): the active collection
  // id comes from the static registry above, not from this response, so
  // there's no need to wait for it before starting the records fetch.
  useEffect(() => {
    let isMounted = true;

    if (!collectionsRequestRef.current) {
      collectionsRequestRef.current = data.listCollections();
    }

    collectionsRequestRef.current
      .then((nextCollections) => {
        if (!isMounted) {
          return;
        }

        setCollections(nextCollections);
        // Only overridden if the live registry's first entry genuinely
        // differs from the static one assumed at mount.
        setActiveCollectionId((current) => current || nextCollections[0]?.id || "");
      })
      .catch((nextError) => {
        // Let a genuine retry (e.g. the user reloading) issue a fresh request.
        collectionsRequestRef.current = null;

        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCollections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!activeCollectionId) {
      return;
    }

    let isMounted = true;

    if (recordsRequestRef.current?.collectionId !== activeCollectionId) {
      recordsRequestRef.current = {
        collectionId: activeCollectionId,
        promise: data.listRecords(activeCollectionId, { fields: "list" })
      };
    }

    const { promise } = recordsRequestRef.current;

    promise
      .then(({ records: nextRecords }) => {
        if (!isMounted) {
          return;
        }

        setRecords(nextRecords);

        // A singleton collection has exactly one record to work with —
        // open it directly instead of making the editor wait for a table
        // click that has nothing else to select anyway.
        const isSingleton = collectionRegistry.find((collection) => collection.id === activeCollectionId)?.singleton;

        if (isSingleton && nextRecords.length > 0) {
          setSelectedRecordId((current) => current ?? nextRecords[0].id);
        }
      })
      .catch((nextError) => {
        if (recordsRequestRef.current?.collectionId === activeCollectionId) {
          recordsRequestRef.current = null;
        }

        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecords(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId, data]);

  // `records` only ever holds list-trimmed `values` now (every list fetch
  // passes `fields: "list"`), so it can never stand in for a full draft —
  // every selection (a table click, a singleton's auto-open, or landing on a
  // freshly created/duplicated record) always loads the authoritative record
  // through `getRecord` below. `draftRecord`'s derivation further down stays
  // `null` until this resolves, which is what shows the editor skeleton
  // instead of ever flashing trimmed/stale values.
  const recordRequestRef = useRef<{ key: string; promise: Promise<CmsRecord> } | null>(null);

  useEffect(() => {
    if (!selectedRecordId || !activeCollectionId) {
      return;
    }

    // Keyed by collection+record so a StrictMode dev double-invoke (both
    // firing synchronously, before either has settled) reuses the same
    // in-flight promise instead of issuing a duplicate GET. Cleared as soon
    // as it settles — unlike the collections/records refs above, this one
    // must NOT keep serving a resolved promise for later reselections of the
    // same id (e.g. close a just-saved record, reopen it): that would replay
    // stale pre-edit values instead of fetching fresh ones.
    const key = `${activeCollectionId}:${selectedRecordId}`;
    let isMounted = true;

    if (recordRequestRef.current?.key !== key) {
      recordRequestRef.current = { key, promise: data.getRecord(activeCollectionId, selectedRecordId) };
    }

    const { promise } = recordRequestRef.current;

    promise
      .then((record) => {
        if (recordRequestRef.current?.key === key) {
          recordRequestRef.current = null;
        }

        if (isMounted) {
          setDraftRecordState(record);
          setLastSavedRecordState(record);
        }
      })
      .catch((nextError) => {
        if (recordRequestRef.current?.key === key) {
          recordRequestRef.current = null;
        }

        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId, selectedRecordId, data]);

  /** Revokes and forgets one staged file, if it's still tracked (a no-op otherwise — safe to call speculatively). */
  function revokePendingUpload(url: string) {
    if (pendingUploadsRef.current.delete(url)) {
      URL.revokeObjectURL(url);
    }
  }

  /** Revokes and forgets every file staged for the currently open draft — the discard/switch/close path. */
  function revokeAllPendingUploads() {
    for (const url of pendingUploadsRef.current.keys()) {
      URL.revokeObjectURL(url);
    }

    pendingUploadsRef.current.clear();
  }

  // Whatever accumulates in `pendingUploadsRef` only ever belongs to the
  // record currently open in the editor. The moment `selectedRecordId`
  // changes — closing the editor, switching to a different record, a
  // just-created/duplicated record taking over the selection — this
  // cleanup fires for the *previous* id and drops anything left staged
  // under it. (`reloadRecord`, the "Discard" button's handler, keeps the
  // same id, so it revokes explicitly itself rather than relying on this.)
  useEffect(() => {
    return () => {
      revokeAllPendingUploads();
    };
  }, [selectedRecordId]);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) ?? collections[0];

  const filteredRecords = useMemo(() => {
    if (!activeCollection) {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const title = getRecordTitle(activeCollection, record).toLowerCase();

      if (title.includes(query)) {
        return true;
      }

      // Match per field rather than joining every value into one string:
      // joining lets a query span two unrelated fields, and booleans
      // stringify to "true"/"false", which would match almost every record.
      return Object.values(record.values).some((value) => {
        if (typeof value === "boolean" || value === null || value === undefined) {
          return false;
        }

        return String(value).toLowerCase().includes(query);
      });
    });
  }, [activeCollection, records, search]);

  // Hidden selections (records ticked, then filtered out by a search) must not
  // silently accumulate. Adjusted directly during render — the idiomatic way
  // to keep one piece of state in sync with another without an extra render
  // pass (see "Adjusting state when a prop changes" in the React docs).
  const [prevFilteredRecords, setPrevFilteredRecords] = useState(filteredRecords);

  if (filteredRecords !== prevFilteredRecords) {
    setPrevFilteredRecords(filteredRecords);
    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const visibleIds = new Set(filteredRecords.map((record) => record.id));
      let changed = false;
      const next = new Set<string>();

      for (const id of current) {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }

  // What the UI should actually see: `null` whenever the raw state doesn't
  // (yet) match the selected id, so switching records can never flash the
  // previous one's data or accept edits into it while the new one loads.
  const draftRecord = draftRecordState && draftRecordState.id === selectedRecordId ? draftRecordState : null;
  const lastSavedRecord = lastSavedRecordState && lastSavedRecordState.id === selectedRecordId ? lastSavedRecordState : null;

  const isDirty = useMemo(() => {
    if (!draftRecord || !lastSavedRecord || draftRecord.id !== lastSavedRecord.id || !activeCollection) {
      return false;
    }

    if (draftRecord.publishStatus !== lastSavedRecord.publishStatus) {
      return true;
    }

    return !areValuesEqual(activeCollection, draftRecord.values, lastSavedRecord.values);
  }, [activeCollection, draftRecord, lastSavedRecord]);

  // Discourage navigating away (closing the tab, reloading) with unsaved edits.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Drives the top bar's "Publish site" button: it only appears once some
  // collection actually has something queued. Lives on the summary rather
  // than being derived from `records` because the active collection's
  // records are only a slice of what's queued across the whole registry.
  const queuedCount = useMemo(() => collections.reduce((sum, collection) => sum + collection.queuedCount, 0), [collections]);

  const groups = useMemo<CollectionGroup[]>(() => {
    return collections.reduce<CollectionGroup[]>((acc, collection) => {
      const groupName = collection.group ?? "Collections";
      const group = acc.find((item) => item.group === groupName);

      if (group) {
        group.collections.push(collection);
      } else {
        acc.push({ group: groupName, collections: [collection] });
      }

      return acc;
    }, []);
  }, [collections]);

  function handleSelectCollection(collectionId: string) {
    if (collectionId === activeCollectionId) {
      // Nothing changes, so don't flip the table into a "Loading records…"
      // state the id-keyed fetch effect will never clear.
      return;
    }

    setIsLoadingRecords(true);
    setSelectedRecordId(null);
    setDraftRecordState(null);
    setLastSavedRecordState(null);
    setSearch("");
    setError(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setActiveCollectionId(collectionId);
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleRecordSelected(recordId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  function toggleSelectAll(selected: boolean) {
    setSelectedIds(selected ? new Set(filteredRecords.map((record) => record.id)) : new Set());
  }

  async function handleDeleteRecords(ids: string[]) {
    if (!activeCollection || ids.length === 0) {
      return;
    }

    setError(null);

    // Settle every delete before touching state: one failed delete must not
    // stop the rest from running, or leave the list/sidebar count stale.
    const results = await Promise.allSettled(ids.map((id) => data.deleteRecord(activeCollection.id, id)));
    const failedCount = results.filter((result) => result.status === "rejected").length;

    try {
      const { records: nextRecords } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      await refreshCollections();
      // A deleted record may be referenced elsewhere by id — drop it from the
      // shared reference-options cache so those selects/columns stop offering it.
      bumpReferenceCache(activeCollection.id);
    } catch (nextError) {
      pushActionErrorToast(toast, "Delete failed", nextError);
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });

    if (selectedRecordId && ids.includes(selectedRecordId)) {
      setSelectedRecordId(null);
      setDraftRecordState(null);
      setLastSavedRecordState(null);
    }

    if (failedCount > 0) {
      toast.push({
        tone: "error",
        title: "Delete failed",
        description: `Unable to delete ${failedCount} of ${ids.length} record${ids.length === 1 ? "" : "s"}.`,
        duration: 8000
      });
    }
  }

  async function handleImportRecords(rows: Array<Record<string, CmsRecordValue>>) {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      await data.importRecords(activeCollection.id, rows);
      const { records: nextRecords } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      await refreshCollections();
      bumpReferenceCache(activeCollection.id);
      setIsImportOpen(false);
    } catch (nextError) {
      pushActionErrorToast(toast, "Import failed", nextError);
    }
  }

  /**
   * `recordsToExport` comes from `records`/`filteredRecords`, which only ever
   * carry list-trimmed `values` now — a CSV needs every field, so this always
   * re-fetches with `fields: "all"` rather than exporting what's on screen.
   */
  async function handleExport(recordsToExport: CmsRecord[]) {
    if (!activeCollection || recordsToExport.length === 0) {
      return;
    }

    setError(null);

    try {
      const ids = new Set(recordsToExport.map((record) => record.id));
      const { records: fullRecords } = await data.listRecords(activeCollection.id, { fields: "all" });
      const selected = fullRecords.filter((record) => ids.has(record.id));
      exportRecords(activeCollection, selected);
    } catch (nextError) {
      pushActionErrorToast(toast, "Export failed", nextError);
    }
  }

  async function handleCreateRecord() {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      const record = await data.createRecord(activeCollection.id);
      const { records: nextRecords } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      await refreshCollections();
      bumpReferenceCache(activeCollection.id);
      // Select it and let the getRecord effect load it — same path as any
      // other selection, rather than trusting this response as the draft.
      setSelectedRecordId(record.id);
    } catch (nextError) {
      pushActionErrorToast(toast, "Create failed", nextError);
    }
  }

  /**
   * Finds a slug not already in use for `collectionId`, starting from
   * `<baseSlug>-copy` and counting up (`-copy-2`, `-copy-3`, …) until one is
   * free. `search` does a case-insensitive substring match across every
   * text/textarea/richtext/slug column (server-side, see `NeonDataStore`)
   * and — critically — is unpaginated when no `limit` is given, so one call
   * with `baseSlug` itself reliably surfaces every existing "<baseSlug>…"
   * variant regardless of how many pages the table would otherwise have.
   * Membership is still checked with exact equality, so an unrelated record
   * that merely contains `baseSlug` as a substring elsewhere can't cause a
   * false collision.
   */
  async function findUniqueSlug(collectionId: string, fieldKey: string, baseSlug: string): Promise<string> {
    const { records: matches } = await data.listRecords(collectionId, { search: baseSlug, fields: "list" });
    const existingSlugs = new Set(
      matches.map((record) => record.values[fieldKey]).filter((value): value is string => typeof value === "string")
    );

    let candidate = `${baseSlug}-copy`;
    let suffix = 2;

    while (existingSlugs.has(candidate)) {
      candidate = `${baseSlug}-copy-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  async function handleDuplicateRecord() {
    if (!activeCollection || !draftRecord) {
      return;
    }

    setError(null);

    try {
      const values: Record<string, CmsRecordValue> = { ...draftRecord.values };

      // System identifiers must not carry into the copy; the backend assigns new ones.
      for (const field of activeCollection.fields) {
        if (field.type === "readonly") {
          delete values[field.key];
        }
      }

      const titleKey = activeCollection.titleField;
      if (titleKey && typeof values[titleKey] === "string" && values[titleKey]) {
        values[titleKey] = `${values[titleKey]} (copy)`;
      }

      // A slug is typically unique-constrained server-side; carrying the
      // original's value straight into the copy would fail the insert
      // outright (a 409/validation error, caught below) rather than
      // reading as a silently-refused duplicate.
      for (const field of activeCollection.fields) {
        if (field.type !== "slug") {
          continue;
        }

        const currentSlug = values[field.key];

        if (typeof currentSlug === "string" && currentSlug) {
          values[field.key] = await findUniqueSlug(activeCollection.id, field.key, currentSlug);
        }
      }

      // A pending upload's blob: URL only ever resolves through THIS
      // record's own Save — importRecords has no upload step to turn it
      // into a real bucket URL, so carrying it into the copy would just
      // persist a browser-local URL that stops resolving once the tab closes.
      const { values: cleanValues, stripped } = stripBlobUrls(activeCollection, values);

      const [copy] = await data.importRecords(activeCollection.id, [cleanValues]);
      const { records: nextRecords } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      await refreshCollections();
      bumpReferenceCache(activeCollection.id);

      if (stripped) {
        toast.push({
          tone: "info",
          title: "Pending uploads were not copied",
          description: "Save the original first to include them.",
          duration: 8000
        });
      }

      if (copy) {
        // Same rule as create: select it and let the getRecord effect load it.
        setSelectedRecordId(copy.id);
      }
    } catch (nextError) {
      pushActionErrorToast(toast, "Duplicate failed", nextError);
    }
  }

  async function handleSaveRecord(nextStatus?: PublishStatus) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    setIsSaving(true);
    setError(null);

    let recordToSave = nextStatus ? { ...draftRecord, publishStatus: nextStatus } : draftRecord;

    // Everything still staged (a `blob:` URL sitting in a value/gallery item)
    // must become a real bucket URL before this record is ever sent to the
    // server — nothing has been uploaded before this point (see the module
    // comment on `pendingUploadsRef`). All-or-nothing: if any file fails,
    // the whole save aborts without touching the draft, so a retry just
    // tries the same pending files again.
    const pendingEntries = Array.from(pendingUploadsRef.current.entries());

    if (pendingEntries.length > 0) {
      setUploadProgress({ completed: 0, total: pendingEntries.length });

      const replacements = new Map<string, AssetUploadResult>();
      // An array, not a `let`-reassigned single value: a `let` mutated only
      // from inside `worker` (called indirectly through `Promise.all`)
      // doesn't reliably re-widen its narrowed type across the `await`
      // below under every TS version, and this sidesteps that entirely —
      // `push` on a `const` binding is exempt from that narrowing pitfall.
      const failures: Array<{ fileName: string; error: unknown }> = [];
      let completed = 0;
      let nextIndex = 0;

      async function worker() {
        while (nextIndex < pendingEntries.length && failures.length === 0) {
          const [blobUrl, entry] = pendingEntries[nextIndex];
          nextIndex += 1;

          try {
            const result = await storage.uploadAsset(activeCollection.id, entry.fieldKey, entry.file);
            replacements.set(blobUrl, result);
            completed += 1;
            setUploadProgress({ completed, total: pendingEntries.length });
          } catch (uploadError) {
            failures.push({ fileName: entry.fileName, error: uploadError });
          }
        }
      }

      const workerCount = Math.min(UPLOAD_CONCURRENCY, pendingEntries.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
      setUploadProgress(null);

      // Apply whatever succeeded *before* deciding whether to bail: with
      // concurrency > 1, other workers can easily land a file after the
      // first failure is seen. Discarding those successes would mean a
      // retry re-uploads them too, orphaning the first copy in the bucket.
      if (replacements.size > 0) {
        for (const result of replacements.values()) {
          rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });
        }

        // Only the field keys a successful upload actually touched — see
        // `replaceBlobUrlsForKeys`'s doc comment for why this must not be a
        // wholesale replace of every value.
        const affectedKeys = new Set(
          pendingEntries.filter(([blobUrl]) => replacements.has(blobUrl)).map(([, entry]) => entry.fieldKey)
        );

        setDraftRecordState((current) =>
          current && current.id === recordToSave.id
            ? { ...current, values: replaceBlobUrlsForKeys(activeCollection, current.values, replacements, affectedKeys) }
            : current
        );

        // What actually gets sent to the server below: the click-time
        // snapshot with the same swap applied. Any OTHER edit made after
        // Save was clicked (to this record's other fields, or even
        // reordering/captioning this same gallery) stays local — exactly
        // like an edit made while the PUT itself is in flight, restored by
        // the merge further down.
        recordToSave = {
          ...recordToSave,
          values: replaceBlobUrlsForKeys(activeCollection, recordToSave.values, replacements, affectedKeys)
        };

        for (const blobUrl of replacements.keys()) {
          revokePendingUpload(blobUrl);
        }
      }

      if (failures.length > 0) {
        setIsSaving(false);
        const [firstFailure] = failures;
        pushActionErrorToast(toast, "Upload failed", new Error(`${firstFailure.fileName}: ${describeCmsError(firstFailure.error)}`));
        return;
      }
    }

    // Belt and braces: guarantees the request below can never carry a
    // browser-local URL, even if a bug upstream let one slip through.
    assertNoBlobUrls(activeCollection, recordToSave.values);

    // Snapshot of what we're sending, so we can tell afterwards which fields
    // the user changed *while the request was in flight*.
    const valuesAtSaveStart = recordToSave.values;

    try {
      const savedRecord = await data.saveRecord(activeCollection.id, recordToSave, {
        expectedModifiedAt: lastSavedRecord?.modifiedAt
      });

      setDraftRecordState((current) => {
        if (!current || current.id !== savedRecord.id) {
          // The user navigated away from this record before the save resolved.
          return current;
        }

        // Server-normalised values win for every field the user left alone;
        // anything they changed since the save started is preserved.
        const mergedValues: Record<string, CmsRecordValue> = { ...savedRecord.values };

        for (const key of Object.keys(current.values)) {
          if (current.values[key] !== valuesAtSaveStart[key]) {
            mergedValues[key] = current.values[key];
          }
        }

        return { ...savedRecord, values: mergedValues };
      });
      setLastSavedRecordState(savedRecord);
      setRecords((currentRecords) => currentRecords.map((record) => (record.id === savedRecord.id ? savedRecord : record)));
      // The saved values may include this collection's titleField (or the
      // record could be new to a reference select's page size), so any
      // cached options for this collection could now be stale.
      bumpReferenceCache(activeCollection.id);

      // A plain field-value save never moves a record in or out of
      // "queued_to_publish", so only a status-changing save needs to refresh
      // the summaries the Publish button and sidebar counts read from.
      if (nextStatus) {
        await refreshCollections();
      }
    } catch (nextError) {
      // Deliberately does not touch draftRecordState/lastSavedRecordState: a
      // failed save (e.g. a 409 conflict or a validation error) must leave the
      // draft exactly as the editor left it, still marked dirty, rather than
      // silently discarding their edits. For a `conflict`, describeCmsError's
      // message is what tells them to reload before trying again.
      pushActionErrorToast(toast, "Save failed", nextError);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Re-reads the active collection's records and count without disturbing the
   * open draft. Used after a publish transition changes statuses server-side.
   */
  async function refreshRecords() {
    if (!activeCollection) {
      return;
    }

    try {
      const { records: nextRecords, total } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      setCollections((currentCollections) =>
        currentCollections.map((collection) => (collection.id === activeCollection.id ? { ...collection, count: total } : collection))
      );

      if (selectedRecordId && !isDirty) {
        const record = await data.getRecord(activeCollection.id, selectedRecordId);
        setDraftRecordState(record);
        setLastSavedRecordState(record);
      }
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /**
   * Re-fetches the collection registry and replaces `collections` wholesale
   * (both `count` and `queuedCount`), leaving `activeCollectionId` untouched.
   * Called after anything that can move a record's publish status or change
   * how many records a collection holds.
   */
  async function refreshCollections() {
    try {
      const nextCollections = await data.listCollections();
      setCollections(nextCollections);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /** Bulk status override for the selection toolbar's "Update items" menu. */
  async function handleUpdateSelectedStatus(status: Exclude<PublishStatus, "published">) {
    if (!activeCollection || selectedIds.size === 0) {
      return;
    }

    setError(null);

    try {
      const updated = await data.setPublishStatus(activeCollection.id, Array.from(selectedIds), status);
      const updatedById = new Map(updated.map((record) => [record.id, record] as const));

      setRecords((currentRecords) => currentRecords.map((record) => updatedById.get(record.id) ?? record));
      await refreshCollections();
    } catch (nextError) {
      pushActionErrorToast(toast, "Update failed", nextError);
    }
  }

  /** Discards the draft and re-fetches the record — the recovery path from a `conflict` save error. */
  async function reloadRecord() {
    if (!activeCollection || !selectedRecordId) {
      return;
    }

    setError(null);

    // Same id stays selected (a plain refetch, not a navigation), so the
    // selectedRecordId-keyed cleanup effect never fires for this — drop
    // every staged file explicitly instead. Discarding is exactly the case
    // the spec calls out: the editor is about to show the server's stored
    // values, so any file staged against the old draft is moot.
    revokeAllPendingUploads();

    try {
      const record = await data.getRecord(activeCollection.id, selectedRecordId);
      setDraftRecordState(record);
      setLastSavedRecordState(record);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /** Revokes any pending-upload blob URL(s) that `nextValue` no longer references, for a value that just changed from `previousValue`. */
  function revokeBlobUrlsDroppedBy(previousValue: CmsRecordValue, nextValue: CmsRecordValue) {
    const previousItems = parseGalleryValue(previousValue);

    // A gallery field's value is a JSON array of items; a scalar asset
    // field's is the URL itself. `parseGalleryValue` tolerantly returns []
    // for anything that isn't a valid items array, so this only takes the
    // "gallery" branch for values that actually parse as one.
    if (previousItems.length > 0 || parseGalleryValue(nextValue).length > 0) {
      const nextSrcs = new Set(parseGalleryValue(nextValue).map((item) => item.src));

      for (const item of previousItems) {
        if (!nextSrcs.has(item.src)) {
          revokePendingUpload(item.src);
        }
      }

      return;
    }

    if (typeof previousValue === "string" && previousValue !== nextValue) {
      revokePendingUpload(previousValue);
    }
  }

  function updateDraftValue(fieldKey: string, value: CmsRecordValue) {
    // Read outside the updater: `setDraftRecordState`'s callback must stay a
    // pure function of its input (React may invoke it more than once under
    // StrictMode), but revoking an object URL is a real side effect.
    revokeBlobUrlsDroppedBy(draftRecord?.values[fieldKey], value);

    setDraftRecordState((record) => {
      if (!record) {
        return record;
      }

      return {
        ...record,
        values: {
          ...record.values,
          [fieldKey]: value
        }
      };
    });
  }

  /**
   * Optimises (when the file looks like a raster image) and stages `file`:
   * nothing is uploaded here. The result is a `blob:` object URL tracked in
   * `pendingUploadsRef` — `handleSaveRecord` uploads it for real and swaps
   * the URL over when the record is saved. Returns `null` (after its own
   * toast) if optimisation fails or the file is still over the upload limit.
   */
  async function stageFile(fieldKey: string, file: File): Promise<string | null> {
    try {
      const staged = looksLikeImage(file)
        ? await optimizeImage(file)
        : { file, originalSize: file.size, finalSize: file.size, skipped: true };

      if (staged.file.size > MAX_ASSET_UPLOAD_BYTES) {
        const limitMb = (MAX_ASSET_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
        const fileMb = (staged.file.size / (1024 * 1024)).toFixed(1);
        throw new Error(`${file.name} is ${fileMb}MB, which is over the ${limitMb}MB upload limit.`);
      }

      const blobUrl = URL.createObjectURL(staged.file);
      pendingUploadsRef.current.set(blobUrl, { file: staged.file, fieldKey, fileName: staged.file.name, size: staged.file.size });
      rememberAssetMeta(blobUrl, {
        fileName: staged.file.name,
        size: staged.file.size,
        originalSize: staged.skipped ? undefined : staged.originalSize
      });

      return blobUrl;
    } catch (stageError) {
      const message = stageError instanceof Error ? stageError.message : `Couldn't process ${file.name}.`;
      toast.push({ tone: "error", title: "Couldn't add file", description: message, duration: 8000 });
      return null;
    }
  }

  async function handleAssetUpload(field: AssetField, file: File) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    // Capture which record we're staging into: if the editor switches to a
    // different record before optimisation resolves, the file must not land there.
    const targetRecordId = draftRecord.id;
    setOptimizingField(field.key);
    setError(null);

    const blobUrl = await stageFile(field.key, file);

    setOptimizingField(null);

    if (!blobUrl) {
      return;
    }

    setDraftRecordState((current) => {
      if (!current || current.id !== targetRecordId) {
        // The editor moved on while this was optimising — nothing to stage
        // it into any more.
        revokePendingUpload(blobUrl);
        return current;
      }

      // A replace: the value being overwritten, if it was itself still
      // pending, is now orphaned — drop it rather than leaking it.
      const previous = current.values[field.key];
      if (typeof previous === "string" && previous && previous !== blobUrl) {
        revokePendingUpload(previous);
      }

      return {
        ...current,
        values: {
          ...current.values,
          [field.key]: blobUrl
        }
      };
    });
  }

  /**
   * Optimises and stages several files onto a `gallery` field,
   * `GALLERY_PROCESS_CONCURRENCY` at a time, appending each as a `blob:`
   * item to the field's items as soon as it's ready (so tiles appear one by
   * one rather than all at once at the end). Nothing is uploaded here — see
   * `handleSaveRecord`. One file failing doesn't stop the others — each
   * failure gets its own toast (from `stageFile`) and the batch keeps going.
   */
  async function handleGalleryUpload(field: GalleryField, files: File[]) {
    if (!activeCollection || !draftRecord || files.length === 0) {
      return;
    }

    // Same guard as handleAssetUpload: if the editor switches records mid
    // batch, a late-arriving file must not land on the new draft.
    const targetRecordId = draftRecord.id;
    const fieldKey = field.key;

    // Enforce the field's cap client-side: the server would otherwise accept
    // the save and silently drop the overflow, which reads as data loss.
    const maxItems = field.maxItems ?? 200;
    const currentCount = parseGalleryValue(draftRecord.values[fieldKey]).length;
    const allowed = Math.max(0, maxItems - currentCount);
    const filesToStage = files.length > allowed ? files.slice(0, allowed) : files;

    if (files.length > allowed) {
      toast.push({
        tone: "info",
        title: "Gallery limit reached",
        description: `Only ${allowed} more image${allowed === 1 ? "" : "s"} can be added (limit ${maxItems}).`,
        duration: 8000
      });
    }

    if (filesToStage.length === 0) {
      return;
    }

    let remaining = filesToStage.length;
    // Keyed by record as well as field: without `recordId`, switching to a
    // different record's gallery mid-batch would show ITS progress as
    // "optimising" too, since only the field key was being compared.
    setGalleryOptimizing({ recordId: targetRecordId, fieldKey, remaining });
    setError(null);

    let nextIndex = 0;

    function isSameBatch(current: GalleryOptimizeProgress) {
      return current !== null && current.recordId === targetRecordId && current.fieldKey === fieldKey;
    }

    async function worker() {
      while (nextIndex < filesToStage.length) {
        const file = filesToStage[nextIndex];
        nextIndex += 1;

        const blobUrl = await stageFile(fieldKey, file);

        if (blobUrl) {
          setDraftRecordState((current) => {
            if (!current || current.id !== targetRecordId) {
              revokePendingUpload(blobUrl);
              return current;
            }

            const items = parseGalleryValue(current.values[fieldKey]);
            return {
              ...current,
              values: {
                ...current.values,
                [fieldKey]: serializeGalleryValue([...items, { src: blobUrl }])
              }
            };
          });
        }

        remaining -= 1;
        setGalleryOptimizing((current) => (isSameBatch(current) ? { recordId: targetRecordId, fieldKey, remaining } : current));
      }
    }

    const workerCount = Math.min(GALLERY_PROCESS_CONCURRENCY, filesToStage.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    setGalleryOptimizing((current) => (isSameBatch(current) ? null : current));
  }

  function clearError() {
    setError(null);
  }

  return {
    activeCollection,
    activeCollectionId,
    clearError,
    draftRecord,
    error,
    filteredRecords,
    galleryOptimizing,
    groups,
    handleAssetUpload,
    handleCreateRecord,
    handleDeleteRecords,
    handleDuplicateRecord,
    handleExport,
    handleGalleryUpload,
    handleImportRecords,
    handleSaveRecord,
    handleSelectCollection,
    handleUpdateSelectedStatus,
    isDirty,
    isImportOpen,
    isLoadingCollections,
    isLoadingRecords,
    isSaving,
    optimizingField,
    queuedCount,
    records,
    refreshCollections,
    refreshRecords,
    reloadRecord,
    search,
    selectedIds,
    selectedRecordId,
    selectionMode,
    setIsImportOpen,
    setSearch,
    setSelectedRecordId,
    toggleRecordSelected,
    toggleSelectAll,
    toggleSelectionMode,
    updateDraftValue,
    uploadProgress
  };
}
