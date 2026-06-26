import type { ChangeEvent, ReactNode } from "react";
import { ExternalLink, Upload } from "lucide-react";
import { cn } from "@three-acts/template";
import type { AssetField, CmsField, CmsRecord, CmsRecordValue, SelectField, SlugField } from "../../cms/types";
import { buttonVariants, Input, inputClass, Select, Textarea, Toggle } from "../atoms";
import { toDateTimeLocal } from "../../lib/format";

type FieldControlProps = {
  field: CmsField;
  onAssetUpload: (field: AssetField, event: ChangeEvent<HTMLInputElement>) => void;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  record: CmsRecord;
  uploadingField: string | null;
};

export function FieldControl({ field, onAssetUpload, onUpdateValue, record, uploadingField }: FieldControlProps) {
  const value = record.values[field.key] ?? "";
  const inputId = `${record.id}-${field.key}`;

  if (field.type === "readonly") {
    return (
      <FieldShell field={field} inputId={inputId}>
        <div className={cn(inputClass, "flex items-center text-cms-muted")}>{String(value || record.id)}</div>
      </FieldShell>
    );
  }

  if (field.type === "textarea") {
    return (
      <FieldShell field={field} inputId={inputId}>
        <Textarea
          className="min-h-[86px] resize-y leading-6"
          id={inputId}
          onChange={(event) => onUpdateValue(field.key, event.target.value)}
          value={String(value)}
        />
      </FieldShell>
    );
  }

  if (field.type === "boolean") {
    return (
      <FieldShell field={field} inputId={inputId}>
        <Toggle checked={Boolean(value)} id={inputId} onChange={(checked) => onUpdateValue(field.key, checked)} />
      </FieldShell>
    );
  }

  if (field.type === "select") {
    const selectField = field as SelectField;

    return (
      <FieldShell field={field} inputId={inputId}>
        <Select
          id={inputId}
          onValueChange={(next) => onUpdateValue(field.key, next)}
          options={[{ label: "Select...", value: "" }, ...selectField.options]}
          value={String(value)}
        />
      </FieldShell>
    );
  }

  if (field.type === "asset") {
    const assetField = field as AssetField;
    const fileValue = String(value);

    return (
      <FieldShell field={field} inputId={inputId}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="flex min-h-7 min-w-0 items-center overflow-hidden rounded border border-dashed border-cms-track bg-cms-surface px-2 text-[13px] text-cms-muted shadow-inner shadow-black/50">
            <span className="truncate">{fileValue || "No file selected"}</span>
          </div>
          <label className={buttonVariants({ variant: "normal" })}>
            <Upload size={16} />
            {uploadingField === field.key ? "Uploading..." : "Upload"}
            <input
              accept={assetField.accept}
              className="sr-only"
              disabled={uploadingField === field.key}
              id={inputId}
              onChange={(event) => onAssetUpload(assetField, event)}
              type="file"
            />
          </label>
        </div>
      </FieldShell>
    );
  }

  if (field.type === "slug") {
    const slugField = field as SlugField;

    return (
      <FieldShell field={field} inputId={inputId}>
        <Input id={inputId} onChange={(event) => onUpdateValue(field.key, event.target.value)} value={String(value)} />
        {slugField.urlPrefix ? (
          <div className="mt-1.5 flex min-h-6 items-center gap-1.5 overflow-hidden rounded bg-cms-raised px-2 text-[11px] text-cms-muted shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
            <ExternalLink size={16} aria-hidden="true" />
            {slugField.urlPrefix}
            <strong className="font-semibold text-cms-text">{String(value)}</strong>
          </div>
        ) : null}
      </FieldShell>
    );
  }

  return (
    <FieldShell field={field} inputId={inputId}>
      <Input
        id={inputId}
        onChange={(event) => onUpdateValue(field.key, field.type === "number" ? Number(event.target.value) : event.target.value)}
        type={field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text"}
        value={field.type === "datetime" ? toDateTimeLocal(String(value)) : String(value)}
      />
    </FieldShell>
  );
}

function FieldShell({ children, field, inputId }: { children: ReactNode; field: CmsField; inputId: string }) {
  return (
    <div className="mb-3.5 grid gap-1.5 last:mb-0">
      <label className="text-[11px] text-cms-text" htmlFor={inputId}>
        {field.label}
        {field.required ? <span className="text-red-400">*</span> : null}
      </label>
      {children}
      {field.helpText ? <p className="m-0 text-[11px] text-cms-muted">{field.helpText}</p> : null}
    </div>
  );
}
