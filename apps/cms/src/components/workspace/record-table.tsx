import { Check } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { formatDateTime } from "../../lib/format";
import { Checkbox, ScrollArea, StatusPill } from "../atoms";

type RecordTableProps = {
  collection: CmsCollectionSummary;
  isLoading: boolean;
  onSelectRecord: (recordId: string) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onToggleSelected: (recordId: string) => void;
  records: CmsRecord[];
  selectedIds: Set<string>;
  selectionMode: boolean;
};

export function RecordTable({
  collection,
  isLoading,
  onSelectRecord,
  onToggleSelectAll,
  onToggleSelected,
  records,
  selectedIds,
  selectionMode
}: RecordTableProps) {
  const columns = collection.listColumns;
  const columnTemplate = columns.map((column) => column.width ?? "minmax(140px, 1fr)").join(" ");
  const gridTemplateColumns = selectionMode ? `36px ${columnTemplate}` : columnTemplate;
  const allSelected = records.length > 0 && records.every((record) => selectedIds.has(record.id));
  const someSelected = records.some((record) => selectedIds.has(record.id));

  if (isLoading) {
    return <div className="flex-1 p-4 text-[11px] text-cms-muted">Loading records...</div>;
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="min-w-[980px]" role="table" aria-label={`${collection.label} table`}>
        <div
          className="sticky top-0 z-10 grid h-8 items-center border-b border-cms-raised bg-cms-bg text-[11px] font-bold text-cms-text"
          role="row"
          style={{ gridTemplateColumns }}
        >
          {selectionMode ? (
            <div className="flex items-center justify-center" role="columnheader">
              <Checkbox ariaLabel="Select all" checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleSelectAll} />
            </div>
          ) : null}
          {columns.map((column) => (
            <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3" key={column.key} role="columnheader">
              {column.label}
            </div>
          ))}
        </div>
        {records.map((record) => {
          const selected = selectedIds.has(record.id);

          return (
            <button
              className={cn(
                "grid h-8 w-full items-center border-b border-cms-raised/40 bg-cms-bg text-left text-[11px] text-cms-text transition hover:bg-cms-raised",
                selected && "bg-cms-raised"
              )}
              key={record.id}
              onClick={() => (selectionMode ? onToggleSelected(record.id) : onSelectRecord(record.id))}
              role="row"
              style={{ gridTemplateColumns }}
              type="button"
            >
              {selectionMode ? (
                <span className="flex items-center justify-center" role="cell">
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-[3px] border",
                      selected ? "border-cms-accent bg-cms-accent text-white" : "border-cms-track text-transparent"
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                </span>
              ) : null}
              {columns.map((column) => (
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3" key={column.key} role="cell">
                  {renderColumnValue(collection, record, column.key, column.valueType)}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function renderColumnValue(collection: CmsCollectionSummary, record: CmsRecord, key: string, valueType?: string) {
  if (key === "publishStatus" || valueType === "status") {
    return <StatusPill status={record.publishStatus} />;
  }

  const value = key === "createdAt" || key === "modifiedAt" ? record[key] : record.values[key];

  if (valueType === "datetime") {
    return formatDateTime(String(value ?? ""));
  }

  if (valueType === "boolean") {
    return value ? "Yes" : "No";
  }

  if (key === collection.titleField) {
    return <strong className="font-medium">{String(value ?? "")}</strong>;
  }

  return String(value ?? "");
}
