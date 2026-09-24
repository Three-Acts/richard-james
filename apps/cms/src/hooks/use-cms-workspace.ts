import { useEffect, useMemo, useRef, useState } from "react";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import { collectionRegistry } from "../cms/registry";
import type {
  AssetField,
  CmsCollectionSummary,
  CmsRecord,
  CmsRecordValue,
  GalleryField,
  ListRecordsResult,
  PublishStatus
} from "../cms/types";
import { parseGalleryValue, serializeGalleryValue } from "../cms/types";
import { rememberAssetMeta, useToast } from "../components/atoms";
import type { GalleryUploadProgress } from "../components/editor/field-control";
import type { CollectionGroup } from "../components/workspace";
import { areValuesEqual, getRecordTitle } from "../lib/records";
import { exportRecords } from "../lib/export-records";
import { bumpReferenceCache } from "./use-reference-options";

/** How many gallery files upload at once — matches the concurrency asset-field's single-file flow gets "for free". */
const GALLERY_UPLOAD_CONCURRENCY = 3;

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
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [galleryUpload, setGalleryUpload] = useState<GalleryUploadProgress>(null);
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

      const [copy] = await data.importRecords(activeCollection.id, [values]);
      const { records: nextRecords } = await data.listRecords(activeCollection.id, { fields: "list" });
      setRecords(nextRecords);
      await refreshCollections();
      bumpReferenceCache(activeCollection.id);

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

    const recordToSave = nextStatus ? { ...draftRecord, publishStatus: nextStatus } : draftRecord;
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

    try {
      const record = await data.getRecord(activeCollection.id, selectedRecordId);
      setDraftRecordState(record);
      setLastSavedRecordState(record);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  function updateDraftValue(fieldKey: string, value: CmsRecordValue) {
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

  async function handleAssetUpload(field: AssetField, file: File) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    // Capture which record we're uploading into: if the editor switches to a
    // different record before the upload resolves, the URL must not land there.
    const uploadRecordId = draftRecord.id;
    setUploadingField(field.key);
    setError(null);

    try {
      const result = await storage.uploadAsset(activeCollection.id, field.key, file);

      // The record only ever stores the URL, so the real file name/size must
      // be captured now — nothing about the object storage URL itself carries them.
      rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });

      setDraftRecordState((current) => {
        if (!current || current.id !== uploadRecordId) {
          return current;
        }

        return {
          ...current,
          values: {
            ...current.values,
            [field.key]: result.url
          }
        };
      });
    } catch (nextError) {
      setError(describeCmsError(nextError));
    } finally {
      setUploadingField(null);
    }
  }

  /**
   * Uploads several files onto a `gallery` field, `GALLERY_UPLOAD_CONCURRENCY`
   * at a time, appending each `{ src }` to the field's items as soon as it
   * finishes (so tiles appear one by one rather than all at once at the end).
   * One file failing doesn't stop the others — each failure gets its own
   * toast and the rest of the batch keeps going.
   */
  async function handleGalleryUpload(field: GalleryField, files: File[]) {
    if (!activeCollection || !draftRecord || files.length === 0) {
      return;
    }

    // Same guard as handleAssetUpload: if the editor switches records mid
    // upload, a late-arriving file must not land on the new draft.
    const uploadRecordId = draftRecord.id;
    const fieldKey = field.key;
    const collectionId = activeCollection.id;

    // Enforce the field's cap client-side: the server would otherwise accept
    // the save and silently drop the overflow, which reads as data loss.
    const maxItems = field.maxItems ?? 200;
    const currentCount = parseGalleryValue(draftRecord.values[fieldKey]).length;
    const allowed = Math.max(0, maxItems - currentCount);
    const filesToUpload = files.length > allowed ? files.slice(0, allowed) : files;

    if (files.length > allowed) {
      toast.push({
        tone: "info",
        title: "Gallery limit reached",
        description: `Only ${allowed} more image${allowed === 1 ? "" : "s"} can be added (limit ${maxItems}).`,
        duration: 8000
      });
    }

    if (filesToUpload.length === 0) {
      return;
    }

    let remaining = filesToUpload.length;
    // Keyed by record as well as field: without `recordId`, switching to a
    // different record's gallery mid-upload would show ITS progress as
    // "uploading" too, since only the field key was being compared.
    setGalleryUpload({ recordId: uploadRecordId, fieldKey, remaining });
    setError(null);

    let nextIndex = 0;

    function isSameUpload(current: GalleryUploadProgress) {
      return current !== null && current.recordId === uploadRecordId && current.fieldKey === fieldKey;
    }

    async function worker() {
      while (nextIndex < filesToUpload.length) {
        const file = filesToUpload[nextIndex];
        nextIndex += 1;

        try {
          const result = await storage.uploadAsset(collectionId, fieldKey, file);
          rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });

          setDraftRecordState((current) => {
            if (!current || current.id !== uploadRecordId) {
              return current;
            }

            const items = parseGalleryValue(current.values[fieldKey]);
            return {
              ...current,
              values: {
                ...current.values,
                [fieldKey]: serializeGalleryValue([...items, { src: result.url }])
              }
            };
          });
        } catch (nextError) {
          toast.push({
            tone: "error",
            title: "Upload failed",
            description: `${file.name}: ${describeCmsError(nextError)}`,
            duration: 8000
          });
        } finally {
          remaining -= 1;
          setGalleryUpload((current) => (isSameUpload(current) ? { recordId: uploadRecordId, fieldKey, remaining } : current));
        }
      }
    }

    const workerCount = Math.min(GALLERY_UPLOAD_CONCURRENCY, filesToUpload.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    setGalleryUpload((current) => (isSameUpload(current) ? null : current));
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
    galleryUpload,
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
    uploadingField
  };
}
