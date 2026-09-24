import type { CmsCollection, CmsField } from "./types.js";

/** snake_case for camelCase keys: heroImage -> hero_image. */
export function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-+/g, "_").toLowerCase();
}

/** Backing column for a field, honouring explicit `column` then the collection's naming strategy. */
export function columnForField(collection: CmsCollection, field: CmsField): string {
  if (field.column) {
    return field.column;
  }
  return collection.columnNaming === "as_is" ? field.key : toSnakeCase(field.key);
}

export const defaultSystemColumns = {
  id: "id",
  publishStatus: "publish_status",
  createdAt: "created_at",
  modifiedAt: "updated_at"
} as const;

export function systemColumnsFor(collection: CmsCollection): Record<keyof typeof defaultSystemColumns, string> {
  return { ...defaultSystemColumns, ...collection.systemColumns };
}
