import type { CmsCollection, CmsRecordValue } from "./types.js";

/** Keep the trailing separator while typing so the next word doesn't join the previous one. */
export function normalizeSlug(value: string, keepTrailingDash = false): string {
  const slug = value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+/, "");
  return keepTrailingDash ? slug : slug.replace(/-+$/, "");
}

/** Generate only while the saved slug is empty and the draft still follows its title. */
export function updateSlugValues(
  collection: CmsCollection,
  values: Record<string, CmsRecordValue>,
  savedValues: Record<string, CmsRecordValue>,
  fieldKey: string,
  value: CmsRecordValue
): Record<string, CmsRecordValue> {
  const field = collection.fields.find((item) => item.key === fieldKey);
  const next = { ...values, [fieldKey]: field?.type === "slug" ? normalizeSlug(String(value ?? ""), true) : value };
  if (fieldKey === collection.titleField) {
    const previousTitleSlug = normalizeSlug(String(values[fieldKey] ?? ""));
    for (const slugField of collection.fields.filter((item) => item.type === "slug")) {
      if (!savedValues[slugField.key] && (!values[slugField.key] || values[slugField.key] === previousTitleSlug)) {
        next[slugField.key] = normalizeSlug(String(value ?? ""));
      }
    }
  }
  return next;
}
