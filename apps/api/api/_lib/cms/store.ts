import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "../schema.js";

/**
 * Server-side storage contracts for the CMS API, deliberately provider-agnostic.
 * `CmsService` (./service.ts) is the only caller: it owns validation and the
 * collection contract (readonly mode, required fields, etc.), so every
 * implementation here can stay a thin, honest mapping onto its backend.
 *
 * To add another backend (plain Postgres via pg/Drizzle, Cloudflare R2 via the
 * S3 API, ...), implement these two interfaces and register the result in
 * `resolve-store.ts`.
 */
/**
 * `listRecords` options plus a store-only `filter`, used by `api/_lib/content.ts`
 * to read only published records straight from the store instead of
 * over-fetching and filtering in application code. Kept local to this file
 * (not added to the shared `ListRecordsOptions` in `@three-acts/cms-schema`)
 * because it's a server-storage concern, not part of the CMS wire contract.
 */
export type ListRecordsStoreOptions = ListRecordsOptions & {
  filter?: { publishStatus?: PublishStatus };
};

export type RecordToInsert = {
  publishStatus: PublishStatus;
  values: Record<string, CmsRecordValue>;
  /** Generated slug bases, reserved atomically by the store. Never sent to clients. */
  generatedSlugBases?: Record<string, string>;
};

export interface CmsDataStore {
  readonly name: string;

  listRecords(collection: CmsCollection, options: ListRecordsStoreOptions): Promise<ListRecordsResult>;

  countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number>;

  /** Every `PublishStatus`'s count in a single query — see service.ts's `listCollections`. */
  countByStatus(collection: CmsCollection): Promise<Record<PublishStatus, number>>;

  getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null>;

  /** The store owns ids and timestamps for new rows. */
  insertRecords(
    collection: CmsCollection,
    rows: RecordToInsert[]
  ): Promise<CmsRecord[]>;

  /**
   * Persists `record` as given (the caller has already merged/validated
   * values). Implementations always stamp the modified column with "now".
   * When `expectedModifiedAt` is provided, the update is conditioned on the
   * stored record still having that `modifiedAt` (optimistic concurrency):
   * - returns the updated record on success
   * - returns `"conflict"` when the record exists but its stored
   *   `modifiedAt` no longer matches `expectedModifiedAt`
   * - returns `null` when the record does not exist at all
   * Ordered collections move the edited record and shift siblings atomically.
   * `orderingProvided: false` preserves its latest position under the lock;
   * `generatedSlugBases` requests atomic reservation of title-derived slugs.
   */
  updateRecord(collection: CmsCollection, record: CmsRecord, expectedModifiedAt?: string, orderingProvided?: boolean, generatedSlugBases?: Record<string, string>): Promise<CmsRecord | "conflict" | null>;

  /** Returns whether a row was actually deleted. */
  deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean>;

  /**
   * Flips every `queued_to_publish` record in this collection to `published`;
   * returns the ids that changed, so a caller whose subsequent deploy fails
   * can revert exactly these records (and no others) back to
   * `queued_to_publish`.
   * Ordered collections also promote queued deliberate moves, without counting
   * indirectly shifted siblings in the returned ids.
   */
  publishQueued(collection: CmsCollection): Promise<string[]>;

  /**
   * Sets `status` (and stamps the modified column with "now") on every id in
   * `recordIds` that exists in this collection. Returns the updated records
   * in the same order as `recordIds`, silently skipping unknown ids.
   */
  setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]>;
}

export interface CmsBlobStore {
  readonly name: string;

  upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }>;
}
