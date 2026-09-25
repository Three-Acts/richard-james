import {
  CmsError,
  MAX_ASSET_UPLOAD_BYTES,
  collectionRegistry,
  parseGalleryValue,
  referenceFieldsOf,
  serializeGalleryValue,
  type AssetField,
  type AssetUploadResult,
  type CmsCollection,
  type CmsCollectionSummary,
  type CmsField,
  type CmsRecord,
  type CmsRecordValue,
  type GalleryField,
  type ListRecordsOptions,
  type ListRecordsResult,
  type PublishQueuedResult,
  type PublishStatus,
  type SelectField,
  type UploadAssetBody
} from "../schema.js";
import { getBlobStore, getDataStore } from "./resolve-store.js";

const MAX_IMPORT_ROWS = 1000;
const MAX_STATUS_RECORD_IDS = 1000;
const STATUS_TARGETS: ReadonlyArray<PublishStatus> = ["queued_to_publish", "not_published"];

function getCollectionOrThrow(collectionId: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === collectionId);
  if (!collection) {
    throw new CmsError("not_found", `Unknown collection: ${collectionId}`);
  }
  return collection;
}

/** Enforces the collection contract: readonly collections reject editor writes (delete is exempt — see deleteRecord). */
function assertWritable(collection: CmsCollection): CmsCollection {
  if (collection.mode === "readonly") {
    throw new CmsError("readonly", `${collection.label} is read-only: records are created by the site, not editors.`);
  }
  return collection;
}

/**
 * Enforces `allowCreate === false` (the collection's set of records is
 * fixed — e.g. the `pages` collection cannot grow or shrink). `singleton`
 * collections are a narrow exception: creation is allowed exactly once, when
 * the collection currently has zero records, so first-time setup (or the
 * seed script, though that writes through the store directly and never hits
 * this) can still produce the one record. Shared by createRecord and
 * importRecords — both are ways of creating new records.
 */
async function assertCreateAllowed(collection: CmsCollection): Promise<void> {
  if (collection.allowCreate === false) {
    if (collection.singleton) {
      const count = await getDataStore().countRecords(collection);
      if (count === 0) {
        return;
      }
    }
    throw new CmsError("forbidden", `${collection.label} pages are fixed; new records cannot be created.`);
  }
}

/** Enforces `allowDelete === false` (the collection's set of records is fixed). */
function assertDeleteAllowed(collection: CmsCollection): void {
  if (collection.allowDelete === false) {
    throw new CmsError("forbidden", `${collection.label} pages are fixed; records cannot be deleted.`);
  }
}

function validationError(field: CmsField, message: string): CmsError {
  return new CmsError("validation", message, { details: { field: field.key } });
}

function defaultValueForField(field: CmsField): CmsRecordValue {
  if (field.type === "boolean") return false;
  if (field.type === "number") return 0;
  return "";
}

/**
 * Validates and normalizes a single field's incoming value: select values
 * must be one of the configured options, numbers/booleans must coerce
 * cleanly, and datetimes are "" or a parseable value normalized to ISO UTC.
 *
 * `required` is a publish-time rule, not a draft-time one: editors create an
 * empty record and fill it in, so emptiness is only rejected when
 * `enforceRequired` is set (saving as published / queued to publish).
 */
function validateFieldValue(field: CmsField, raw: CmsRecordValue, enforceRequired: boolean): CmsRecordValue {
  switch (field.type) {
    case "text":
    case "textarea":
    case "slug":
    case "asset":
    case "reference":
    case "richtext": {
      const text = raw === null || raw === undefined ? "" : String(raw);
      if (enforceRequired && field.required && !text.trim()) {
        throw validationError(field, `${field.label} is required.`);
      }
      return text;
    }
    case "number": {
      if (raw === "" || raw === null || raw === undefined) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return 0;
      }
      const num = typeof raw === "number" ? raw : Number(raw);
      if (typeof raw === "boolean" || Number.isNaN(num)) {
        throw validationError(field, `${field.label} must be a number.`);
      }
      return num;
    }
    case "boolean": {
      if (typeof raw === "boolean") {
        return raw;
      }
      if (raw === null || raw === undefined) {
        return false;
      }
      throw validationError(field, `${field.label} must be true or false.`);
    }
    case "select": {
      const text = raw === null || raw === undefined ? "" : String(raw);
      if (!text) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return "";
      }
      const selectField = field as SelectField;
      if (!selectField.options.some((option) => option.value === text)) {
        throw validationError(field, `${field.label} must be one of the configured options.`);
      }
      return text;
    }
    case "datetime": {
      const text = raw === null || raw === undefined ? "" : String(raw).trim();
      if (!text) {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return "";
      }
      const parsed = Date.parse(text);
      if (Number.isNaN(parsed)) {
        throw validationError(field, `${field.label} must be a valid date/time.`);
      }
      return new Date(parsed).toISOString();
    }
    case "gallery": {
      const galleryField = field as GalleryField;
      const maxItems = galleryField.maxItems ?? 200;

      if (raw === null || raw === undefined || raw === "") {
        if (enforceRequired && field.required) {
          throw validationError(field, `${field.label} is required.`);
        }
        return serializeGalleryValue([]);
      }

      // The client sends either the stored JSON string or (from the editor's
      // in-memory state) an already-parsed array — accept both, but unlike
      // `parseGalleryValue` (used for trusted, already-stored values) be
      // strict here: malformed JSON or a non-array is a validation error,
      // not silently swallowed to an empty gallery.
      const rawValue: unknown = raw;
      let parsedArray: unknown;
      if (Array.isArray(rawValue)) {
        parsedArray = rawValue;
      } else if (typeof rawValue === "string") {
        try {
          parsedArray = JSON.parse(rawValue);
        } catch {
          throw validationError(field, `${field.label} must be a list of images.`);
        }
      } else {
        throw validationError(field, `${field.label} must be a list of images.`);
      }

      if (!Array.isArray(parsedArray)) {
        throw validationError(field, `${field.label} must be a list of images.`);
      }

      // Now apply `parseGalleryValue`'s tolerant per-item cleaning (drop
      // entries without a string `src`, trim/drop empty captions) and cap.
      const items = parseGalleryValue(JSON.stringify(parsedArray)).slice(0, maxItems);

      // The empty-check above only catches "" / null / undefined — a client
      // sending "[]" or [] (an explicitly empty gallery) reaches here with
      // an empty `items`, which must still fail a required gallery.
      if (enforceRequired && field.required && items.length === 0) {
        throw validationError(field, `${field.label} is required.`);
      }

      return serializeGalleryValue(items);
    }
    default:
      return raw ?? "";
  }
}

/**
 * Builds a full, validated `values` map for a collection from client input,
 * falling back to `existingValues` (on save) or a type-appropriate default
 * (on create/import) for any field the client didn't send. Readonly-type
 * fields are never accepted from the client: their existing stored value is
 * kept as-is (or "" when there isn't one yet).
 */
function buildRecordValues(
  collection: CmsCollection,
  input: Partial<Record<string, CmsRecordValue>> | undefined,
  existingValues: Record<string, CmsRecordValue> | undefined,
  enforceRequired = false
): Record<string, CmsRecordValue> {
  const values: Record<string, CmsRecordValue> = {};

  for (const field of collection.fields) {
    if (field.type === "readonly") {
      values[field.key] = existingValues?.[field.key] ?? "";
      continue;
    }

    const provided = Boolean(input && Object.prototype.hasOwnProperty.call(input, field.key));
    let raw: CmsRecordValue;

    if (provided) {
      raw = input![field.key];
    } else if (existingValues && Object.prototype.hasOwnProperty.call(existingValues, field.key)) {
      raw = existingValues[field.key];
    } else {
      raw = defaultValueForField(field);
    }

    values[field.key] = validateFieldValue(field, raw, enforceRequired);
  }

  return values;
}

/**
 * Validates every `reference` field's value against the referenced
 * collection: empty is allowed here (required-ness is `validateFieldValue`'s
 * job); a non-empty value must be an id that actually exists in that
 * collection. Kept as a separate async pass after `buildRecordValues`
 * (which is synchronous) rather than folding it into per-field validation.
 */
async function assertReferencesExist(collection: CmsCollection, values: Record<string, CmsRecordValue>): Promise<void> {
  const refFields = referenceFieldsOf(collection);
  if (refFields.length === 0) {
    return;
  }

  const store = getDataStore();

  for (const field of refFields) {
    const raw = values[field.key];
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id) {
      continue;
    }

    const referencedCollection = collectionRegistry.find((item) => item.id === field.collection);
    if (!referencedCollection) {
      throw validationError(field, `${field.label} must reference an existing ${field.collection}.`);
    }

    const referenced = await store.getRecord(referencedCollection, id);
    if (!referenced) {
      throw validationError(field, `${field.label} must reference an existing ${referencedCollection.label}.`);
    }
  }
}

function isPublishStatus(value: unknown): value is PublishStatus {
  return value === "published" || value === "not_published" || value === "queued_to_publish";
}

/** Only editorial (or default-mode) collections have a publish workflow; "data"/"readonly" collections never queue. */
function hasPublishWorkflow(collection: CmsCollection): boolean {
  return collection.mode === undefined || collection.mode === "editorial";
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return cleaned || "file";
}

export async function listCollections(): Promise<CmsCollectionSummary[]> {
  const store = getDataStore();
  // One grouped query per collection (see `countByStatus`), all collections
  // in parallel — was two sequential `countRecords` queries per collection.
  return Promise.all(
    collectionRegistry.map(async (collection) => {
      const counts = await store.countByStatus(collection);
      return {
        ...collection,
        count: counts.published + counts.not_published + counts.queued_to_publish,
        queuedCount: hasPublishWorkflow(collection) ? counts.queued_to_publish : 0
      };
    })
  );
}

export async function listRecords(collectionId: string, options: ListRecordsOptions): Promise<ListRecordsResult> {
  const collection = getCollectionOrThrow(collectionId);
  return getDataStore().listRecords(collection, options);
}

export async function getRecord(collectionId: string, recordId: string): Promise<CmsRecord> {
  const collection = getCollectionOrThrow(collectionId);
  const record = await getDataStore().getRecord(collection, recordId);
  if (!record) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
  return record;
}

export async function createRecord(collectionId: string, values?: Partial<Record<string, CmsRecordValue>>): Promise<CmsRecord> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));
  await assertCreateAllowed(collection);
  const normalizedValues = buildRecordValues(collection, values, undefined);
  await assertReferencesExist(collection, normalizedValues);
  const [record] = await getDataStore().insertRecords(collection, [{ publishStatus: "not_published", values: normalizedValues }]);
  return record;
}

export async function saveRecord(
  collectionId: string,
  recordId: string,
  record: CmsRecord,
  expectedModifiedAt?: string
): Promise<CmsRecord> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));

  if (record.id !== undefined && record.id !== recordId) {
    throw new CmsError("validation", "record.id does not match the URL record id.");
  }

  const store = getDataStore();
  const existing = await store.getRecord(collection, recordId);
  if (!existing) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }

  const publishStatus = isPublishStatus(record.publishStatus) ? record.publishStatus : existing.publishStatus;
  // Required fields gate publishing, not drafting.
  const enforceRequired = publishStatus === "published" || publishStatus === "queued_to_publish";
  const normalizedValues = buildRecordValues(collection, record.values, existing.values, enforceRequired);
  await assertReferencesExist(collection, normalizedValues);

  const nextRecord: CmsRecord = {
    id: existing.id,
    publishStatus,
    createdAt: existing.createdAt,
    modifiedAt: existing.modifiedAt,
    values: normalizedValues
  };

  const result = await store.updateRecord(collection, nextRecord, expectedModifiedAt);

  if (result === "conflict") {
    throw new CmsError("conflict", "This record was changed elsewhere. Reload and try again.");
  }
  if (result === null) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
  return result;
}

export async function deleteRecord(collectionId: string, recordId: string): Promise<void> {
  const collection = getCollectionOrThrow(collectionId);
  // Intentionally not gated by assertWritable: readonly collections still
  // allow delete ("view, export, delete only" — see CollectionMode in types.ts).
  assertDeleteAllowed(collection);
  const deleted = await getDataStore().deleteRecord(collection, recordId);
  if (!deleted) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
}

export async function importRecords(collectionId: string, rows: Array<Record<string, CmsRecordValue>>): Promise<CmsRecord[]> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));
  await assertCreateAllowed(collection);

  if (!Array.isArray(rows)) {
    throw new CmsError("validation", "rows must be an array.");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new CmsError("validation", `Import is limited to ${MAX_IMPORT_ROWS} rows per request.`);
  }

  const prepared = rows.map((row) => ({
    publishStatus: "not_published" as const,
    values: buildRecordValues(collection, row, undefined)
  }));

  for (const row of prepared) {
    await assertReferencesExist(collection, row.values);
  }

  return getDataStore().insertRecords(collection, prepared);
}

export async function uploadAsset(collectionId: string, fieldKey: string, body: UploadAssetBody): Promise<AssetUploadResult> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));
  const field = collection.fields.find((item) => item.key === fieldKey);

  // A `gallery` field uploads one file per request too (the editor's
  // multi-file drop zone issues one upload call per file, then appends the
  // returned URL to the field's JSON item list) — both field types carry
  // `bucket`/`accept`, so the upload itself is identical either way.
  if (!field || (field.type !== "asset" && field.type !== "gallery")) {
    throw new CmsError("not_found", `Unknown asset field: ${fieldKey}`);
  }
  const assetField: AssetField | GalleryField = field;

  if (!body || typeof body.fileName !== "string" || !body.fileName.trim()) {
    throw new CmsError("validation", "fileName is required.");
  }
  if (typeof body.size !== "number" || !Number.isFinite(body.size) || body.size <= 0) {
    throw new CmsError("validation", "size must be a positive number.");
  }
  if (body.size > MAX_ASSET_UPLOAD_BYTES) {
    throw new CmsError("validation", `File exceeds the ${MAX_ASSET_UPLOAD_BYTES} byte upload limit.`);
  }
  if (typeof body.data !== "string" || !body.data) {
    throw new CmsError("validation", "data is required.");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.data, "base64");
  } catch {
    throw new CmsError("validation", "data must be base64-encoded.");
  }

  if (buffer.length === 0 || buffer.length > MAX_ASSET_UPLOAD_BYTES) {
    throw new CmsError("validation", `File exceeds the ${MAX_ASSET_UPLOAD_BYTES} byte upload limit.`);
  }

  const safeName = sanitizeFileName(body.fileName);
  // Prefixed so editor uploads never collide with keys the seed script writes
  // under `images/...` for the same collection/table names.
  const path = `uploads/${collection.tableName}/${Date.now()}-${safeName}`;
  const contentType = typeof body.contentType === "string" && body.contentType ? body.contentType : "application/octet-stream";

  const uploaded = await getBlobStore().upload({ bucket: assetField.bucket, path, contentType, data: buffer });

  return { path: uploaded.path, url: uploaded.url, fileName: body.fileName, size: buffer.length };
}

export async function publishQueued(collectionId?: string): Promise<PublishQueuedResult> {
  const collections = collectionId ? [getCollectionOrThrow(collectionId)] : collectionRegistry;
  const store = getDataStore();

  const recordsByCollection: PublishQueuedResult["recordsByCollection"] = [];
  let published = 0;

  for (const collection of collections) {
    const recordIds = await store.publishQueued(collection);
    if (recordIds.length > 0) {
      recordsByCollection.push({ collectionId: collection.id, recordIds });
      published += recordIds.length;
    }
  }

  return { published, recordsByCollection };
}

/**
 * Bulk status override for the selection toolbar ("Update items"). Only
 * `queued_to_publish` and `not_published` are valid targets — `published` is
 * reached solely through `publishQueued` + a site deploy — and only
 * collections with a publish workflow can be queued at all.
 */
export async function setPublishStatus(collectionId: string, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));

  if (!Array.isArray(recordIds) || recordIds.length === 0 || !recordIds.every((id) => typeof id === "string")) {
    throw new CmsError("validation", "recordIds must be a non-empty array of strings.");
  }
  if (recordIds.length > MAX_STATUS_RECORD_IDS) {
    throw new CmsError("validation", `Status updates are limited to ${MAX_STATUS_RECORD_IDS} records per request.`);
  }

  if (status === "published") {
    throw new CmsError(
      "validation",
      "Records are published by running publishQueued and deploying the site, not by setting status directly. Use 'queued_to_publish' to queue them first."
    );
  }
  if (!STATUS_TARGETS.includes(status)) {
    throw new CmsError("validation", "publishStatus must be 'queued_to_publish' or 'not_published'.");
  }

  if (!hasPublishWorkflow(collection)) {
    throw new CmsError("validation", `${collection.label} has no publish workflow.`);
  }

  return getDataStore().setPublishStatus(collection, recordIds, status);
}
