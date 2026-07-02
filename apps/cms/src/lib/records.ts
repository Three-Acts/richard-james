import type { CmsCollection, CmsCollectionSummary, CmsRecord, CollectionMode } from "../cms/types";

export function getRecordTitle(collection: CmsCollectionSummary, record: CmsRecord) {
  const titleKey = collection.titleField ?? "name";
  const fallback = record.values.name || record.values.title || record.id;

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
