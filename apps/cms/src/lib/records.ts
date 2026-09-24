import type { AssetUploadResult, CmsCollection, CmsCollectionSummary, CmsField, CmsRecord, CmsRecordValue, CollectionMode } from "../cms/types";
import { parseGalleryValue, serializeGalleryValue } from "../cms/types";
import { normalizeMarkdown } from "./normalize-markdown";

export function getRecordTitle(collection: CmsCollectionSummary, record: CmsRecord) {
  const titleKey = collection.titleField ?? "name";
  // A brand-new or imported record can have an empty title; show a readable
  // placeholder rather than a blank cell or a raw UUID.
  const fallback = record.values.name || record.values.title || "Untitled";

  return String(record.values[titleKey] || fallback);
}

export function getCollectionMode(collection: CmsCollection): CollectionMode {
  return collection.mode ?? "editorial";
}

/** Editors can change field values, create records, and import. */
export function isEditable(collection: CmsCollection) {
  return getCollectionMode(collection) !== "readonly";
}

/** Records carry a Publish Status and publish controls. */
export function hasPublishWorkflow(collection: CmsCollection) {
  return getCollectionMode(collection) === "editorial";
}

/**
 * Shallow-compares two records' editable surface (field values), field by
 * field, using `collection.fields` to tell a `richtext` value apart from
 * every other type. A richtext editor round-trips markdown through its
 * document model, so two values that are the same edit can differ only in
 * whitespace/line-endings — comparing those raw is what made an untouched
 * record read as dirty right after opening it. Every other field type still
 * gets a plain equality check.
 */
export function areValuesEqual(
  collection: CmsCollection,
  a: Record<string, CmsRecordValue>,
  b: Record<string, CmsRecordValue>
): boolean {
  const richtextKeys = new Set(collection.fields.filter((field) => field.type === "richtext").map((field) => field.key));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    const valueA = a[key] ?? null;
    const valueB = b[key] ?? null;

    if (richtextKeys.has(key) && typeof valueA === "string" && typeof valueB === "string") {
      if (normalizeMarkdown(valueA) !== normalizeMarkdown(valueB)) {
        return false;
      }

      continue;
    }

    if (valueA !== valueB) {
      return false;
    }
  }

  return true;
}

/** One field's value with every `blob:` URL it references (a scalar asset value, or a gallery item's `src`) swapped for its uploaded bucket URL. Order and captions are untouched. */
function replaceBlobUrlsForField(
  field: CmsField,
  value: CmsRecordValue,
  replacements: Map<string, AssetUploadResult>
): CmsRecordValue {
  if (field.type === "gallery") {
    const items = parseGalleryValue(value);

    if (items.length === 0) {
      return value;
    }

    let changed = false;
    const nextItems = items.map((item) => {
      const replacement = replacements.get(item.src);

      if (!replacement) {
        return item;
      }

      changed = true;
      return { ...item, src: replacement.url };
    });

    return changed ? serializeGalleryValue(nextItems) : value;
  }

  if (typeof value === "string") {
    const replacement = replacements.get(value);

    if (replacement) {
      return replacement.url;
    }
  }

  return value;
}

/**
 * Swaps every `blob:` URL in `values` that appears in `replacements` for its
 * uploaded bucket URL, across every field. Used by `useCmsWorkspace`'s
 * `handleSaveRecord` for the values actually sent to the server (a snapshot
 * from when Save was clicked, so a concurrent edit elsewhere can't leak in).
 */
export function replaceBlobUrls(
  collection: CmsCollection,
  values: Record<string, CmsRecordValue>,
  replacements: Map<string, AssetUploadResult>
): Record<string, CmsRecordValue> {
  const next: Record<string, CmsRecordValue> = { ...values };

  for (const field of collection.fields) {
    next[field.key] = replaceBlobUrlsForField(field, next[field.key], replacements);
  }

  return next;
}

/**
 * Same swap as `replaceBlobUrls`, restricted to `keys`. Used to update the
 * *live* draft once uploads finish: the upload phase is asynchronous, so the
 * editor may have changed some other field (or even this same gallery's
 * captions/order) while it ran — restricting to the affected keys means only
 * the blob: → bucket-URL swap itself touches the draft, leaving every other
 * field exactly as the editor currently has it.
 */
export function replaceBlobUrlsForKeys(
  collection: CmsCollection,
  values: Record<string, CmsRecordValue>,
  replacements: Map<string, AssetUploadResult>,
  keys: Iterable<string>
): Record<string, CmsRecordValue> {
  const next: Record<string, CmsRecordValue> = { ...values };
  const fieldsByKey = new Map(collection.fields.map((field) => [field.key, field] as const));

  for (const key of keys) {
    const field = fieldsByKey.get(key);

    if (field) {
      next[key] = replaceBlobUrlsForField(field, next[key], replacements);
    }
  }

  return next;
}

/**
 * Strips every `blob:` URL out of `values` (an asset field cleared to `""`,
 * a gallery item with a blob: `src` dropped entirely) — used before
 * duplicating a record: `importRecords` has no upload step to resolve a
 * pending file into a real bucket URL, so carrying one into the copy would
 * just persist a browser-local URL that stops resolving once the tab
 * closes. `stripped` is true when anything was actually removed, so the
 * caller can tell the editor their pending upload wasn't copied.
 */
export function stripBlobUrls(
  collection: CmsCollection,
  values: Record<string, CmsRecordValue>
): { values: Record<string, CmsRecordValue>; stripped: boolean } {
  const next: Record<string, CmsRecordValue> = { ...values };
  let stripped = false;

  for (const field of collection.fields) {
    const value = next[field.key];

    if (field.type === "gallery") {
      const items = parseGalleryValue(value);
      const kept = items.filter((item) => !item.src.startsWith("blob:"));

      if (kept.length !== items.length) {
        stripped = true;
        next[field.key] = serializeGalleryValue(kept);
      }

      continue;
    }

    if (typeof value === "string" && value.startsWith("blob:")) {
      stripped = true;
      next[field.key] = "";
    }
  }

  return { values: next, stripped };
}

/**
 * Safety net behind the pending-upload flow (see `useCmsWorkspace`'s
 * `handleSaveRecord`): every `blob:` object URL created for a staged
 * asset/gallery file must be replaced with a real bucket URL before the
 * save's PUT ever goes out. Throws with a clear message if one slipped
 * through, rather than silently persisting a browser-local URL that stops
 * resolving the moment the tab closes.
 */
export function assertNoBlobUrls(collection: CmsCollection, values: Record<string, CmsRecordValue>): void {
  for (const field of collection.fields) {
    const value = values[field.key];

    if (field.type === "gallery") {
      for (const item of parseGalleryValue(value)) {
        if (item.src.startsWith("blob:")) {
          throw new Error(`Refusing to save ${collection.id}.${field.key}: a gallery item is still a local blob: URL (${item.src}).`);
        }
      }
      continue;
    }

    if (typeof value === "string" && value.startsWith("blob:")) {
      throw new Error(`Refusing to save ${collection.id}.${field.key}: value is still a local blob: URL (${value}).`);
    }
  }
}
