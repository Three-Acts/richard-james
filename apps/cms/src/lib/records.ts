import type { CmsCollection, CmsCollectionSummary, CmsRecord, CmsRecordValue, CollectionMode } from "../cms/types";
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
