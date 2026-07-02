export type PublishStatus = "published" | "not_published" | "queued_to_publish";

/**
 * How editors work with a collection's records (mirrors Webflow's split
 * between CMS items and form submissions):
 * - "editorial": site content with a publish workflow — status + publish controls.
 * - "data": editable operational records with no publish workflow (flags, redirects).
 * - "readonly": system-generated records (form submissions) — view, export, delete only.
 */
export type CollectionMode = "editorial" | "data" | "readonly";

export type FieldType = "text" | "slug" | "textarea" | "number" | "boolean" | "select" | "datetime" | "asset" | "readonly";

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
};

export type PrimitiveField = FieldBase<Exclude<FieldType, "select" | "slug" | "asset">>;

export type SelectField = FieldBase<"select"> & {
  type: "select";
  options: SelectOption[];
};

export type SlugField = FieldBase<"slug"> & {
  type: "slug";
  urlPrefix?: string;
};

export type AssetField = FieldBase<"asset"> & {
  type: "asset";
  bucket: string;
  accept?: string;
};

export type CmsField = PrimitiveField | SelectField | SlugField | AssetField;

export type ListColumn = {
  key: string;
  label: string;
  width?: string;
  valueType?: "text" | "status" | "datetime" | "boolean" | "asset";
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
};

export type CmsCollectionSummary = CmsCollection & {
  count: number;
};

export type AssetUploadResult = {
  path: string;
  url: string;
  fileName: string;
  size: number;
};

export type CmsDataAdapter = {
  listCollections: () => Promise<CmsCollectionSummary[]>;
  listRecords: (collectionId: string) => Promise<CmsRecord[]>;
  getRecord: (collectionId: string, recordId: string) => Promise<CmsRecord>;
  saveRecord: (collectionId: string, record: CmsRecord) => Promise<CmsRecord>;
  createRecord: (collectionId: string) => Promise<CmsRecord>;
  deleteRecord: (collectionId: string, recordId: string) => Promise<void>;
  importRecords: (collectionId: string, rows: Array<Record<string, CmsRecordValue>>) => Promise<CmsRecord[]>;
  uploadAsset: (collectionId: string, fieldKey: string, file: File) => Promise<AssetUploadResult>;
};
