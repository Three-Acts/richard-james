import type { ChangeEvent } from "react";
import { ExternalLink, Upload } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { AssetField, CmsField, CmsRecord, CmsRecordValue, SelectField, SlugField } from "../../cms/types";
import { buttonVariants, fileLabelFocusRing, FormField, Input, inputVariants, NumberInput, Select, Textarea, Toggle } from "../atoms";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "../../lib/format";

type FieldControlProps = {
  field: CmsField;
  onAssetUpload: (field: AssetField, event: ChangeEvent<HTMLInputElement>) => void;
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

export function FieldControl({ field, onAssetUpload, onUpdateValue, readOnly, record, uploadingField }: FieldControlProps) {
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
    const fileValue = String(value);

    return (
      <FormField description={field.helpText} htmlFor={uploadId} label={field.label} required={field.required}>
        <div className="grid grid-cols-fill-auto gap-2">
          <div className={cn(inputVariants({ tone: "display" }), "overflow-hidden border-dashed border-cms-track")}>
            <span className={cn("truncate", fileValue && "font-mono")}>{fileValue || "No file selected"}</span>
          </div>
          <label className={cn(buttonVariants({ variant: "normal" }), "cursor-pointer", fileLabelFocusRing)}>
            <Upload size={13} />
            {uploadingField === field.key ? "Uploading…" : "Upload"}
            <input
              accept={assetField.accept}
              className="sr-only"
              disabled={uploadingField === field.key}
              id={uploadId}
              onChange={(event) => onAssetUpload(assetField, event)}
              type="file"
            />
          </label>
        </div>
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
