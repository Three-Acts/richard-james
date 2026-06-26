import type { CmsCollectionSummary, CmsRecord } from "../cms/types";

export function getRecordTitle(collection: CmsCollectionSummary, record: CmsRecord) {
  const titleKey = collection.titleField ?? "name";
  const fallback = record.values.name || record.values.title || record.id;

  return String(record.values[titleKey] || fallback);
}
