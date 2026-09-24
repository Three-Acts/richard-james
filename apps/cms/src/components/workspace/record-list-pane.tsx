import { ArrowLeft } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { getRecordTitle, hasPublishWorkflow } from "../../lib/records";
import { BareIconButton, eyebrowClass, focusRing, PanelHeader, ScrollArea, StatusDot, Tooltip } from "../atoms";

type RecordListPaneProps = {
  collection: CmsCollectionSummary;
  onBack: () => void;
  onSelectRecord: (recordId: string) => void;
  records: CmsRecord[];
  selectedRecordId: string;
};

export function RecordListPane({ collection, onBack, onSelectRecord, records, selectedRecordId }: RecordListPaneProps) {
  const publishable = hasPublishWorkflow(collection);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader>
        <Tooltip content="Back to table">
          <BareIconButton aria-label="Back to table" onClick={onBack}>
            <ArrowLeft size={15} />
          </BareIconButton>
        </Tooltip>
        <span className={eyebrowClass}>{collection.label}</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1">
        {records.map((record) => {
          const selected = record.id === selectedRecordId;

          return (
            <button
              aria-current={selected ? "true" : undefined}
              className={cn(
                "grid h-8 w-full items-center gap-2 border-b border-cms-line px-3 text-left text-ui transition-colors",
                publishable ? "grid-cols-fill-auto" : "grid-cols-1",
                selected ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                focusRing
              )}
              key={record.id}
              onClick={() => onSelectRecord(record.id)}
              type="button"
            >
              <span className="truncate">{getRecordTitle(collection, record)}</span>
              {publishable ? <StatusDot status={record.publishStatus} /> : null}
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}
