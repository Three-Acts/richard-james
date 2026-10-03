import { RecordDragHandle } from "./record-drag-handle";
import { useRecordReordering } from "../../hooks/use-record-reordering";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { singularize } from "../../lib/format";
import { getRecordTitle, isEditable } from "../../lib/records";
import { BareIconButton, columnHeaderClass, focusRing, PanelHeader, ScrollArea, Tooltip } from "../atoms";

type RecordListPaneProps = {
  collection: CmsCollectionSummary;
  isReordering?: boolean;
  onReorder?: (recordId: string, position: number) => void;
  onCreate: () => void;
  onSelectRecord: (recordId: string) => void;
  records: CmsRecord[];
  selectedRecordId: string;
};

// The narrow list pane a record's editor opens beside: the table "collapses"
// to its first column, so the header (40px) and column-header (32px) bands
// must land at the same heights as the full table view — see PanelHeader and
// columnHeaderClass.
export function RecordListPane({ collection, isReordering, onReorder, onCreate, onSelectRecord, records, selectedRecordId }: RecordListPaneProps) {
  const ordering = useRecordReordering(records, onReorder, isReordering);
  const columnLabel = collection.listColumns[0]?.label ?? "Name";
  const newLabel = `New ${singularize(collection.label)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader className="justify-between">
        <h1 className="min-w-0 flex-1 truncate text-ui-lg font-semibold text-cms-text">{collection.label}</h1>
        {isEditable(collection) && (collection.allowCreate ?? true) ? (
          <Tooltip content={newLabel}>
            <BareIconButton aria-label={newLabel} onClick={onCreate}>
              <Plus size={15} />
            </BareIconButton>
          </Tooltip>
        ) : null}
      </PanelHeader>
      <div className={cn(columnHeaderClass, "flex px-3")}>{columnLabel}</div>
      <ScrollArea className="min-h-0 flex-1">
        {records.map((record) => {
          const selected = record.id === selectedRecordId;

          return (
            <div
              {...ordering.rowProps(record.id)}
              className={cn("flex h-8 w-full items-center border-b border-cms-line data-[order-drop=before]:border-t data-[order-drop=before]:border-t-cms-accent data-[order-drop=after]:border-b-cms-accent", ordering.draggedId === record.id && "opacity-50")}
              key={record.id}
            >
              {collection.orderingField ? <RecordDragHandle title={getRecordTitle(collection, record)} {...ordering.handleProps(record.id)} /> : null}
              <button
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "group grid h-8 min-w-0 flex-1 grid-cols-fill-auto items-center gap-2 px-3 text-left text-ui transition-colors",
                  selected ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                  focusRing
                )}
                onClick={() => onSelectRecord(record.id)}
                type="button"
              >
                <span className="truncate">{getRecordTitle(collection, record)}</span>
                <ChevronRight className={cn("text-cms-subtle", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} size={13} />
              </button>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
