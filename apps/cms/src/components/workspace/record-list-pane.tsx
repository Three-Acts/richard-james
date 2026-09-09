import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { getRecordTitle, hasPublishWorkflow } from "../../lib/records";
import { eyebrowClass, focusRing, PanelHeader, ScrollArea, StatusDot } from "../atoms";

type RecordListPaneProps = {
  collection: CmsCollectionSummary;
  onSelectRecord: (recordId: string) => void;
  records: CmsRecord[];
  selectedRecordId: string;
};

export function RecordListPane({ collection, onSelectRecord, records, selectedRecordId }: RecordListPaneProps) {
  const publishable = hasPublishWorkflow(collection);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader>
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
                publishable ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)]",
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
