import { useState } from "react";
import { ArrowLeft, Copy, Lock, Trash2 } from "lucide-react";
import type { AssetField, CmsCollectionSummary, CmsField, CmsRecord, CmsRecordValue, GalleryField, PublishStatus } from "../../cms/types";
import { formatDateTime } from "../../lib/format";
import { getRecordTitle, hasPublishWorkflow, isEditable } from "../../lib/records";
import { BareIconButton, Button, ConfirmDialog, PanelHeader, ScrollArea, SplitButton, StatusPill, Tooltip } from "../atoms";
import { EditorSection } from "./editor-section";
import { DetailRow } from "./detail-row";
import { FieldControl, type GalleryOptimizeProgress, type UploadProgress } from "./field-control";

const READ_ONLY_HINT = "Records in this collection are created by the site and cannot be edited.";

/** "basic" for an unlabelled title/slug field (defensive default), else "custom". */
function sectionOf(field: CmsField): "basic" | "custom" | "seo" {
  if (field.section) {
    return field.section;
  }

  return field.key === "title" || field.key === "slug" ? "basic" : "custom";
}

type RecordEditorProps = {
  collection: CmsCollectionSummary;
  draftRecord: CmsRecord;
  galleryOptimizing: GalleryOptimizeProgress;
  isDirty: boolean;
  isSaving: boolean;
  onAssetUpload: (field: AssetField, file: File) => void;
  onBack: () => void;
  onChangeStatus: (status: Exclude<PublishStatus, "published">) => void;
  onDelete: () => void;
  /** Drops local edits and reloads the stored record (also the recovery path after a save conflict). */
  onDiscard: () => void;
  onDuplicate: () => void;
  onGalleryUpload: (field: GalleryField, files: File[]) => void;
  onSave: () => void;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  optimizingField: string | null;
  /** Non-null while `onSave`'s pending files are uploading — overrides the Save/Queue button labels with "Uploading N of M…". */
  uploadProgress: UploadProgress;
};

export function RecordEditor({
  collection,
  draftRecord,
  galleryOptimizing,
  isDirty,
  isSaving,
  onAssetUpload,
  onBack,
  onChangeStatus,
  onDelete,
  onDiscard,
  onDuplicate,
  onGalleryUpload,
  onSave,
  onUpdateValue,
  optimizingField,
  uploadProgress
}: RecordEditorProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editable = isEditable(collection);
  const publishable = hasPublishWorkflow(collection);
  const allowCreate = collection.allowCreate ?? true;
  const allowDelete = collection.allowDelete ?? true;
  // Files are uploading (the network phase, distinct from `optimizingField`/
  // `galleryOptimizing`'s client-side phase): don't let a new drop start
  // mid-upload, since that file's own eventual Save would race this one.
  // Everything else — title, other text fields — stays editable; a value
  // edited now is preserved (see `handleSaveRecord`'s use of
  // `replaceBlobUrlsForKeys`), it just won't be part of THIS save.
  const isUploading = uploadProgress !== null;
  const savingLabel = uploadProgress
    ? `Uploading ${Math.min(uploadProgress.completed + 1, uploadProgress.total)} of ${uploadProgress.total}…`
    : "Saving…";

  function renderField(field: CmsField) {
    return (
      <FieldControl
        field={field}
        galleryOptimizing={galleryOptimizing}
        key={field.key}
        locked={isUploading}
        onAssetUpload={onAssetUpload}
        onGalleryUpload={onGalleryUpload}
        onUpdateValue={onUpdateValue}
        readOnly={!editable}
        record={draftRecord}
        optimizingField={optimizingField}
      />
    );
  }

  const basicFields = collection.fields.filter((field) => sectionOf(field) === "basic");
  const customFields = collection.fields.filter((field) => sectionOf(field) === "custom");
  const seoFields = collection.fields.filter((field) => sectionOf(field) === "seo");

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg" aria-label={`${getRecordTitle(collection, draftRecord)} editor`}>
      <PanelHeader className="justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Tooltip content="Back to table">
            <BareIconButton aria-label="Back to table" onClick={onBack}>
              <ArrowLeft size={15} />
            </BareIconButton>
          </Tooltip>
          <h2 className="truncate text-ui-lg font-semibold text-cms-text">{getRecordTitle(collection, draftRecord)}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isDirty ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-1 text-ui text-cms-subtle">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cms-pending" />
                Unsaved
              </span>
              <Button disabled={isSaving} onClick={onDiscard} variant="ghost">
                Discard
              </Button>
            </>
          ) : null}
          {publishable ? (
            <>
              <StatusPill status={draftRecord.publishStatus} />
              <SplitButton
                disabled={isSaving}
                label={isSaving ? savingLabel : "Queue to publish"}
                onClick={() => onChangeStatus("queued_to_publish")}
                options={[
                  // Keeping the current status a draft is "not published", not
                  // whatever status is already on the record — this would
                  // silently keep a Published record published otherwise.
                  { label: "Save as draft", onSelect: () => onChangeStatus("not_published") },
                  {
                    disabled: draftRecord.publishStatus !== "published",
                    label: "Unpublish",
                    onSelect: () => onChangeStatus("not_published")
                  }
                ]}
                primaryDisabled={draftRecord.publishStatus === "queued_to_publish"}
              />
            </>
          ) : null}
          {editable ? (
            <Button disabled={isSaving} onClick={onSave} variant={publishable ? "normal" : "primary"}>
              {isSaving ? savingLabel : "Save"}
            </Button>
          ) : (
            <Tooltip content={READ_ONLY_HINT} side="left">
              <span className="inline-flex items-center gap-1.5 px-1 text-ui text-cms-subtle">
                <Lock size={12} />
                Read-only
                {/* The tooltip is visual only, so keep the reason readable by assistive tech. */}
                <span className="sr-only">{READ_ONLY_HINT}</span>
              </span>
            </Tooltip>
          )}
        </div>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        {basicFields.length > 0 ? <EditorSection title="Basic info">{basicFields.map(renderField)}</EditorSection> : null}

        {customFields.length > 0 ? (
          <EditorSection title={editable ? "Custom fields" : "Details"}>{customFields.map(renderField)}</EditorSection>
        ) : null}

        {seoFields.length > 0 ? <EditorSection title="SEO settings">{seoFields.map(renderField)}</EditorSection> : null}

        <EditorSection title="Item details">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {publishable ? (
              <DetailRow label="Publish status">
                <StatusPill status={draftRecord.publishStatus} />
              </DetailRow>
            ) : null}
            <DetailRow label="Created">
              <span className="tabular-nums">{formatDateTime(draftRecord.createdAt)}</span>
            </DetailRow>
            <DetailRow label="Modified">
              <span className="tabular-nums">{formatDateTime(draftRecord.modifiedAt)}</span>
            </DetailRow>
            <DetailRow label="Item ID">
              <code className="truncate">{draftRecord.id}</code>
            </DetailRow>
          </div>
        </EditorSection>
      </ScrollArea>

      <footer className="flex shrink-0 gap-1.5 border-t border-cms-line px-3 py-2.5">
        {editable && allowCreate ? (
          <Button onClick={onDuplicate}>
            <Copy size={13} />
            Duplicate
          </Button>
        ) : null}
        {allowDelete ? (
          <Button className="text-cms-muted hover:text-cms-danger" onClick={() => setIsConfirmingDelete(true)}>
            <Trash2 size={13} />
            Delete
          </Button>
        ) : null}
      </footer>

      <ConfirmDialog
        description="Delete this record? This cannot be undone."
        onConfirm={onDelete}
        onOpenChange={setIsConfirmingDelete}
        open={isConfirmingDelete}
        title={`Delete ${getRecordTitle(collection, draftRecord)}`}
      />
    </section>
  );
}
