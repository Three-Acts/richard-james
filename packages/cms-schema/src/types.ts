export type PublishStatus = "published" | "not_published" | "queued_to_publish";

/**
 * How editors work with a collection's records (mirrors Webflow's split
 * between CMS items and form submissions):
 * - "editorial": site content with a publish workflow — status + publish controls.
 * - "data": editable operational records with no publish workflow (flags, redirects).
 * - "readonly": system-generated records (form submissions) — view, export, delete only.
 */
export type CollectionMode = "editorial" | "data" | "readonly";

export type FieldType = "text" | "slug" | "textarea" | "number" | "boolean" | "select" | "datetime" | "asset" | "reference" | "gallery" | "richtext" | "readonly";

export type CmsRecordValue = string | number | boolean | null | undefined;

export type CmsRecord = {
  id: string;
  publishStatus: PublishStatus;
  createdAt: string;
  modifiedAt: string;
  values: Record<string, CmsRecordValue>;
};

export type SelectOption = {
  label: string;
  value: string;
};

type FieldBase<TType extends FieldType> = {
  key: string;
  label: string;
  type: TType;
  required?: boolean;
  helpText?: string;
  /**
   * Backing column name when it differs from `key`. Adapters fall back to the
   * collection's `columnNaming` strategy (default: snake_case of `key`).
   */
  column?: string;
  /** Editor section. "basic" = title/slug, "seo" = search & social metadata, default "custom". */
  section?: "basic" | "custom" | "seo";
};

export type PrimitiveField = FieldBase<Exclude<FieldType, "select" | "slug" | "asset" | "reference" | "gallery" | "richtext">>;

export type SelectField = FieldBase<"select"> & {
  type: "select";
  options: SelectOption[];
};

/**
 * `urlPrefix` is a full https URL prefix (e.g. "https://www.example.com/projects/");
 * the editor appends the slug and renders the resulting URL as a link to the live page.
 */
export type SlugField = FieldBase<"slug"> & {
  type: "slug";
  urlPrefix?: string;
};

export type AssetField = FieldBase<"asset"> & {
  type: "asset";
  bucket: string;
  accept?: string;
};

/**
 * A reference to a record in another collection. Stored as text: the
 * referenced record's id. The CMS editor renders it as a select populated
 * with the referenced collection's records, labelled by that collection's
 * `titleField`.
 */
export type ReferenceField = FieldBase<"reference"> & {
  type: "reference";
  /** id of the collection whose records can be referenced */
  collection: string;
};

/**
 * An ordered list of uploaded images stored on the record itself as a JSON
 * string: `GalleryItem[]` where `GalleryItem = { src: string; caption?: string }`.
 * The editor renders a multi-file drop zone with a thumbnail grid (reorder,
 * remove, optional caption); each file is uploaded through the asset upload
 * route into `bucket`.
 */
export type GalleryField = FieldBase<"gallery"> & {
  type: "gallery";
  bucket: string;
  accept?: string;
  /** Max items; default 200. */
  maxItems?: number;
};

export type GalleryItem = { src: string; caption?: string };

/** Markdown (GitHub-flavoured plus <u> for underline). */
export type RichTextField = FieldBase<"richtext"> & { type: "richtext" };

export type CmsField = PrimitiveField | SelectField | SlugField | AssetField | ReferenceField | GalleryField | RichTextField;

export type ListColumn = {
  key: string;
  label: string;
  width?: string;
  valueType?: "text" | "status" | "datetime" | "boolean" | "asset" | "reference" | "gallery";
};

export type CmsCollection = {
  id: string;
  label: string;
  tableName: string;
  /** Defaults to "editorial" when omitted. */
  mode?: CollectionMode;
  group?: string;
  titleField?: string;
  description?: string;
  fields: CmsField[];
  listColumns: ListColumn[];
  /**
   * How record-level system fields map onto the backing table. Every value is
   * optional; adapters default to `id`, `publish_status`, `created_at`, `updated_at`.
   */
  systemColumns?: Partial<Record<"id" | "publishStatus" | "createdAt" | "modifiedAt", string>>;
  /** Column naming used when a field has no explicit `column`. Defaults to "snake_case". */
  columnNaming?: "snake_case" | "as_is";
  /** Exactly one record, opened directly (no list, no New/Delete). */
  singleton?: boolean;
  /** Editors may create/duplicate/import records (default true). */
  allowCreate?: boolean;
  /** Editors may delete records (default true). */
  allowDelete?: boolean;
};

export type CmsCollectionSummary = CmsCollection & {
  count: number;
  /** Records currently `queued_to_publish`; drives whether "Publish site" is offered. */
  queuedCount: number;
};

export type AssetUploadResult = {
  path: string;
  url: string;
  fileName: string;
  size: number;
};

/** Query options for `listRecords`. Adapters may ignore `search` and filter client-side. */
export type ListRecordsOptions = {
  search?: string;
  sort?: { key: string; direction: "asc" | "desc" };
  /** Page size. Omit to return every record (scripts only). */
  limit?: number;
  offset?: number;
  /**
   * `"list"` returns each record's `values` trimmed to just what a list view
   * needs (titleField, every `listColumns` key, every `slug`/`reference`
   * field) — never gallery/richtext/textarea/asset columns unless they're
   * also a list column. Omit (or `"all"`) for the full `values` shape.
   */
  fields?: "list" | "all";
};

export type ListRecordsResult = {
  records: CmsRecord[];
  /** Total matching records ignoring `limit`/`offset`. */
  total: number;
};

export type SaveRecordOptions = {
  /**
   * Optimistic concurrency: when set, the adapter rejects the save with a
   * `conflict` error if the stored record's `modifiedAt` no longer matches.
   */
  expectedModifiedAt?: string;
};

/** See `CmsDataAdapter.publishQueued`. */
export type PublishQueuedResult = {
  published: number;
  recordsByCollection: Array<{ collectionId: string; recordIds: string[] }>;
};

/**
 * Record access. Datetime values are ISO 8601 UTC strings ("...Z") or "".
 * Implementations throw `CmsError` (see ./errors) for expected failures so the
 * UI can distinguish not-found, validation, conflict and permission problems.
 */
export type CmsDataAdapter = {
  listCollections: () => Promise<CmsCollectionSummary[]>;
  listRecords: (collectionId: string, options?: ListRecordsOptions) => Promise<ListRecordsResult>;
  getRecord: (collectionId: string, recordId: string) => Promise<CmsRecord>;
  /** The server owns ids and timestamps; optional initial values seed the row. */
  createRecord: (collectionId: string, values?: Partial<Record<string, CmsRecordValue>>) => Promise<CmsRecord>;
  saveRecord: (collectionId: string, record: CmsRecord, options?: SaveRecordOptions) => Promise<CmsRecord>;
  deleteRecord: (collectionId: string, recordId: string) => Promise<void>;
  importRecords: (collectionId: string, rows: Array<Record<string, CmsRecordValue>>) => Promise<CmsRecord[]>;
  /**
   * Publish step 1: flip every `queued_to_publish` record (optionally in one
   * collection) to `published`. The deploy/rebuild is step 2 and lives outside
   * the data adapter. The result reports exactly which records changed (by
   * collection) so a caller whose step 2 then fails can put them back into
   * `queued_to_publish` via `setPublishStatus` instead of leaving them stuck
   * "published" with nothing actually live.
   */
  publishQueued: (collectionId?: string) => Promise<PublishQueuedResult>;
  /**
   * Bulk status override for the selection toolbar ("Update items"). Only
   * `queued_to_publish` and `not_published` are valid targets: `published` is
   * reached solely through `publishQueued` + a site deploy.
   */
  setPublishStatus: (collectionId: string, recordIds: string[], status: Exclude<PublishStatus, "published">) => Promise<CmsRecord[]>;
};

/** File storage. Independent from data so Postgres data can pair with R2/Supabase Storage. */
export type CmsStorageAdapter = {
  uploadAsset: (collectionId: string, fieldKey: string, file: File) => Promise<AssetUploadResult>;
};

/** Everything the CMS needs from a backend, injected via `CmsBackendProvider`. */
export type CmsBackend = {
  name: string;
  data: CmsDataAdapter;
  storage: CmsStorageAdapter;
};
