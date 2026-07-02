import type { ChangeEvent } from "react";
import { ArrowLeft, Copy, Lock, Trash2 } from "lucide-react";
import type { AssetField, CmsCollectionSummary, CmsRecord, CmsRecordValue, PublishStatus } from "../../cms/types";
import { formatDateTime } from "../../lib/format";
import { getRecordTitle, hasPublishWorkflow, isEditable } from "../../lib/records";
import { BareIconButton, Button, PanelHeader, ScrollArea, SplitButton, StatusPill } from "../atoms";
import { EditorSection } from "./editor-section";
import { DetailRow } from "./detail-row";
import { FieldControl } from "./field-control";

type RecordEditorProps = {
  collection: CmsCollectionSummary;
  draftRecord: CmsRecord;
  isSaving: boolean;
  onAssetUpload: (field: AssetField, event: ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onChangeStatus: (status: PublishStatus) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSave: () => void;
  onUpdateValue: (fieldKey: string, value: CmsRecordValue) => void;
  uploadingField: string | null;
};

export function RecordEditor({
  collection,
  draftRecord,
  isSaving,
  onAssetUpload,
  onBack,
  onChangeStatus,
  onDelete,
  onDuplicate,
  onSave,
  onUpdateValue,
  uploadingField
}: RecordEditorProps) {
  const editable = isEditable(collection);
  const publishable = hasPublishWorkflow(collection);

  function confirmDelete() {
    if (window.confirm("Delete this record? This cannot be undone.")) {
      onDelete();
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg" aria-label={`${getRecordTitle(collection, draftRecord)} editor`}>
      <PanelHeader className="justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <BareIconButton aria-label="Back to table" onClick={onBack}>
            <ArrowLeft size={16} />
          </BareIconButton>
          <h2 className="truncate text-[12px] font-bold text-cms-text">{getRecordTitle(collection, draftRecord)}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {publishable ? (
            <>
              <StatusPill status={draftRecord.publishStatus} />
              <SplitButton
                disabled={isSaving}
                label={isSaving ? "Saving..." : "Publish now"}
                onClick={() => onChangeStatus("published")}
                options={[
                  { label: "Queue to publish", onSelect: () => onChangeStatus("queued_to_publish") },
                  { label: "Unpublish", onSelect: () => onChangeStatus("not_published") },
                  { label: "Save as draft", onSelect: onSave }
                ]}
              />
            </>
          ) : null}
          {editable ? (
            <Button disabled={isSaving} onClick={onSave} variant={publishable ? "normal" : "primary"}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-1 text-[11px] text-cms-muted" title="Records in this collection are created by the site and cannot be edited.">
              <Lock size={12} />
              Read-only
            </span>
          )}
        </div>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <EditorSection title="Basic info">
          {collection.fields.slice(0, 3).map((field) => (
            <FieldControl
              field={field}
              key={field.key}
              onAssetUpload={onAssetUpload}
              onUpdateValue={onUpdateValue}
              readOnly={!editable}
              record={draftRecord}
              uploadingField={uploadingField}
            />
          ))}
        </EditorSection>

        <EditorSection title={editable ? "Custom fields" : "Details"}>
          {collection.fields.slice(3).map((field) => (
            <FieldControl
              field={field}
              key={field.key}
              onAssetUpload={onAssetUpload}
              onUpdateValue={onUpdateValue}
              readOnly={!editable}
              record={draftRecord}
              uploadingField={uploadingField}
            />
          ))}
        </EditorSection>

        <EditorSection title="Item details">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-[11px]">
            {publishable ? (
              <DetailRow label="Publish status">
                <StatusPill status={draftRecord.publishStatus} />
              </DetailRow>
            ) : null}
            <DetailRow label="Created">{formatDateTime(draftRecord.createdAt)}</DetailRow>
            <DetailRow label="Modified">{formatDateTime(draftRecord.modifiedAt)}</DetailRow>
            <DetailRow label="Item ID">
              <code className="truncate text-cms-muted">{draftRecord.id}</code>
            </DetailRow>
          </div>
        </EditorSection>
      </ScrollArea>

      <footer className="flex shrink-0 gap-2 border-t border-cms-raised px-3 py-3">
        {editable ? (
          <Button onClick={onDuplicate}>
            <Copy size={16} />
            Duplicate
          </Button>
        ) : null}
        <Button onClick={confirmDelete}>
          <Trash2 size={16} />
          Delete
        </Button>
      </footer>
    </section>
  );
}
