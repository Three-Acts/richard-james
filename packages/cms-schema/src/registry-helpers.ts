import { collectionRegistry } from "./registry";
import type { CmsCollection, ReferenceField } from "./types";

export function findCollection(collectionId: string): CmsCollection | undefined {
  return collectionRegistry.find((collection) => collection.id === collectionId);
}

export function referenceFieldsOf(collection: CmsCollection): ReferenceField[] {
  return collection.fields.filter((field): field is ReferenceField => field.type === "reference");
}
