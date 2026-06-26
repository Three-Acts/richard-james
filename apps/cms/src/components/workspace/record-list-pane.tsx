import { ChevronRight } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { getRecordTitle } from "../../lib/records";
import { PanelHeader, ScrollArea, StatusDot } from "../atoms";

type RecordListPaneProps = {
  collection: CmsCollectionSummary;
  onSelectRecord: (recordId: string) => void;
  records: CmsRecord[];
  selectedRecordId: string;
};

export function RecordListPane({ collection, onSelectRecord, records, selectedRecordId }: RecordListPaneProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader>
        <span className="text-[11px] font-bold text-cms-text">Name</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1">
        {records.map((record) => (
          <button
            className={cn(
              "grid h-8 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-cms-raised/40 bg-cms-bg px-3 text-left text-[11px] text-cms-text hover:bg-cms-raised",
              record.id === selectedRecordId && "bg-cms-raised"
            )}
            key={record.id}
            onClick={() => onSelectRecord(record.id)}
            type="button"
          >
            <span className="truncate">{getRecordTitle(collection, record)}</span>
            <StatusDot status={record.publishStatus} />
            <ChevronRight className="text-cms-muted" size={16} />
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
