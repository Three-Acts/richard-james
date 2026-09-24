import { ExternalLink } from "lucide-react";
import { cn } from "@three-acts/utils";
import type {
  AssetField,
  CmsField,
  CmsRecord,
  CmsRecordValue,
  GalleryField,
  ReferenceField,
  SelectField,
  SlugField
} from "../../cms/types";
import { parseGalleryValue, serializeGalleryValue } from "../../cms/types";
import { AssetControl, FormField, GalleryControl, Input, inputVariants, NumberInput, Select, Textarea, Toggle } from "../atoms";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "../../lib/format";
import { useReferenceOptions } from "../../hooks/use-reference-options";

/**
 * Upload progress for the currently-uploading `gallery` field, if any. Keyed
 * by both the record and the field: without `recordId`, switching to a
 * different record mid-upload would show that record's gallery as "still
 * uploading" too, since only the field key was being compared.
 */
export type GalleryUploadProgress = { recordId: string; fieldKey: string; remaining: number } | null;

type FieldControlProps = {
  field: CmsField;
  /** Files an editor picked/dropped onto a `gallery` field's control. */
  onGalleryUpload: (field: GalleryField, files: File[]) => void;
  galleryUpload: GalleryUploadProgress;
  onAssetUpload: (field: AssetField, file: File) => void;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  /** Render the value as a plain display instead of an editable control. */
  readOnly?: boolean;
  record: CmsRecord;
  uploadingField: string | null;
};

function readOnlyDisplay(field: CmsField, value: CmsRecordValue): string {
  if (field.type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (field.type === "datetime") {
    return value ? formatDateTime(String(value)) : "—";
  }

  if (field.type === "select") {
    const selectField = field as SelectField;
    const match = selectField.options.find((option) => option.value === String(value ?? ""));
    return match?.label ?? (String(value ?? "") || "—");
  }

  return String(value ?? "") || "—";
}

function toNumberValue(value: CmsRecordValue): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * A `reference` field: a Select over the referenced collection's records
 * (label = its titleField value, value = record id), loaded through
 * `useReferenceOptions`. Split out from `FieldControl` so the hook is only
 * ever called for an actual reference field, never behind a runtime branch
 * inside one component (which `react-hooks/rules-of-hooks` would flag).
 */
function ReferenceFieldControl({
  field,
  onUpdateValue,
  readOnly,
  record
}: {
  field: ReferenceField;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  readOnly?: boolean;
  record: CmsRecord;
}) {
  const value = String(record.values[field.key] ?? "");
  const { options, isLoading, error } = useReferenceOptions(field.collection);

  if (readOnly) {
    const match = options.find((option) => option.value === value);
    const shown = match?.label ?? value;

    return (
      <FormField description={field.helpText} label={field.label}>
        <div className={cn(inputVariants({ tone: "display" }))}>{shown || "—"}</div>
      </FormField>
    );
  }

  return (
    <FormField description={field.helpText} label={field.label} required={field.required}>
      <Select
        onValueChange={(next) => onUpdateValue(field.key, next)}
        options={[{ label: isLoading ? "Loading…" : "Select…", value: "" }, ...options]}
        value={value}
      />
      {error ? (
        <p className="m-0 text-ui text-cms-danger" role="alert">
          {error}
        </p>
      ) : null}
    </FormField>
  );
}

export function FieldControl({
  field,
  galleryUpload,
  onAssetUpload,
  onGalleryUpload,
  onUpdateValue,
  readOnly,
  record,
  uploadingField
}: FieldControlProps) {
  const value = record.values[field.key] ?? "";
  // Base UI Field wires labels to its own control parts; only the raw file input needs an id.
  const uploadId = `${record.id}-${field.key}`;

  if (field.type === "readonly") {
    // Only an identifier-shaped field (key contains "id") should fall back to
    // the record id when empty; any other read-only field just reads as empty.
    const isIdField = /id/i.test(field.key);
    const shown = value ? String(value) : isIdField ? record.id : "—";
    // Mono is for identifiers, not for every read-only value — a `readonly` field
    // can just as easily hold a person's name.
    const isIdentifier = shown === record.id;

    return (
      <FormField description={field.helpText} label={field.label}>
        <div className={cn(inputVariants({ tone: "display" }), isIdentifier && "font-mono tabular-nums")}>{shown}</div>
      </FormField>
    );
  }

  if (field.type === "reference") {
    return <ReferenceFieldControl field={field} onUpdateValue={onUpdateValue} readOnly={readOnly} record={record} />;
  }

  if (field.type === "gallery") {
    const galleryField = field as GalleryField;
    const items = parseGalleryValue(value);

    if (readOnly) {
      return (
        <FormField description={field.helpText} label={field.label}>
          <div className={cn(inputVariants({ tone: "display" }))}>
            {items.length > 0 ? `${items.length} image${items.length === 1 ? "" : "s"}` : "—"}
          </div>
        </FormField>
      );
    }

    const isUploadingThisField =
      galleryUpload !== null && galleryUpload.recordId === record.id && galleryUpload.fieldKey === field.key;

    return (
      <FormField description={field.helpText} htmlFor={uploadId} label={field.label} required={field.required}>
        <GalleryControl
          accept={galleryField.accept}
          inputId={uploadId}
          items={items}
          maxItems={galleryField.maxItems ?? 200}
          onChange={(nextItems) => onUpdateValue(field.key, serializeGalleryValue(nextItems))}
          onFiles={(files) => onGalleryUpload(galleryField, files)}
          uploadingCount={isUploadingThisField ? galleryUpload.remaining : 0}
        />
      </FormField>
    );
  }

  if (readOnly) {
    // A required marker is meaningless when nothing can be edited.
    return (
      <FormField description={field.helpText} label={field.label}>
        <div className={cn(inputVariants({ tone: "display" }), "whitespace-pre-wrap", field.type === "textarea" && "min-h-13 items-start py-1.5")}>
          {readOnlyDisplay(field, value)}
        </div>
      </FormField>
    );
  }

  if (field.type === "textarea") {
    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Textarea
          className="min-h-22 resize-y leading-6"
          onChange={(event) => onUpdateValue(field.key, event.target.value)}
          required={field.required}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "boolean") {
    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Toggle checked={Boolean(value)} onChange={(checked) => onUpdateValue(field.key, checked)} />
      </FormField>
    );
  }

  if (field.type === "number") {
    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <NumberInput onValueChange={(next) => onUpdateValue(field.key, next)} required={field.required} value={toNumberValue(value)} />
      </FormField>
    );
  }

  if (field.type === "select") {
    const selectField = field as SelectField;

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Select
          onValueChange={(next) => onUpdateValue(field.key, next)}
          options={[{ label: "Select…", value: "" }, ...selectField.options]}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "asset") {
    const assetField = field as AssetField;

    return (
      <FormField description={field.helpText} htmlFor={uploadId} label={field.label} required={field.required}>
        <AssetControl
          accept={assetField.accept}
          inputId={uploadId}
          isUploading={uploadingField === field.key}
          onClear={() => onUpdateValue(field.key, "")}
          onFile={(file) => onAssetUpload(assetField, file)}
          value={String(value)}
        />
      </FormField>
    );
  }

  if (field.type === "slug") {
    const slugField = field as SlugField;

    return (
      <FormField description={field.helpText} label={field.label} required={field.required}>
        <Input mono onChange={(event) => onUpdateValue(field.key, event.target.value)} required={field.required} value={String(value)} />
        {slugField.urlPrefix ? (
          <div className="flex min-h-6 items-center gap-1.5 overflow-hidden rounded-cms bg-cms-surface px-2 font-mono text-ui text-cms-subtle">
            <ExternalLink size={12} aria-hidden="true" />
            {/* Prefix and slug are one URL, so they must not be split by a gap. */}
            <span className="truncate">
              {slugField.urlPrefix}
              <span className="text-cms-muted">{String(value)}</span>
            </span>
          </div>
        ) : null}
      </FormField>
    );
  }

  return (
    <FormField description={field.helpText} label={field.label} required={field.required}>
      <Input
        onChange={(event) =>
          onUpdateValue(field.key, field.type === "datetime" ? fromDateTimeLocal(event.target.value) : event.target.value)
        }
        required={field.required}
        type={field.type === "datetime" ? "datetime-local" : "text"}
        value={field.type === "datetime" ? toDateTimeLocal(String(value ?? "")) : String(value)}
      />
    </FormField>
  );
}
