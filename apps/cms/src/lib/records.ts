import type { CmsCollection, CmsCollectionSummary, CmsRecord, CollectionMode } from "../cms/types";

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
