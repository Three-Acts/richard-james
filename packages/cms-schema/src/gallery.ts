import type { CmsRecordValue, GalleryItem } from "./types.js";

/** Tolerant parse of a gallery field's stored value into a clean `GalleryItem[]`. */
export function parseGalleryValue(value: CmsRecordValue): GalleryItem[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const items: GalleryItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const src = (entry as { src?: unknown }).src;
    if (typeof src !== "string" || src.trim() === "") continue;
    const item: GalleryItem = { src };
    const rawCaption = (entry as { caption?: unknown }).caption;
    if (typeof rawCaption === "string") {
      const caption = rawCaption.trim();
      if (caption !== "") {
        item.caption = caption;
      }
    }
    items.push(item);
  }
  return items;
}

/** Serializes a gallery field's items back to the stored JSON string form, applying the same cleaning as `parseGalleryValue`. */
export function serializeGalleryValue(items: GalleryItem[]): string {
  const cleaned: GalleryItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry.src !== "string" || entry.src.trim() === "") continue;
    const item: GalleryItem = { src: entry.src };
    if (typeof entry.caption === "string") {
      const caption = entry.caption.trim();
      if (caption !== "") {
        item.caption = caption;
      }
    }
    cleaned.push(item);
  }
  return JSON.stringify(cleaned);
}
