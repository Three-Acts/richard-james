import { collectionRegistry } from "./registry.js";
import type { CmsCollection, ReferenceField } from "./types.js";

export function findCollection(collectionId: string): CmsCollection | undefined {
  return collectionRegistry.find((collection) => collection.id === collectionId);
}

export function referenceFieldsOf(collection: CmsCollection): ReferenceField[] {
  return collection.fields.filter((field): field is ReferenceField => field.type === "reference");
}
