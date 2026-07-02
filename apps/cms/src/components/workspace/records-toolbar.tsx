import { CheckSquare, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { Button, PanelHeader, SearchInput } from "../atoms";

type RecordsToolbarProps = {
  newLabel: string;
  onCreate: () => void;
  onDeleteSelected: () => void;
  onExportAll: () => void;
  onExportSelected: () => void;
  onImport: () => void;
  onSearchChange: (value: string) => void;
  onToggleSelectionMode: () => void;
  /** Read-only collections: records come from the site, so hide New/Import. */
  readOnly?: boolean;
  search: string;
  selectedCount: number;
  selectionMode: boolean;
  title: string;
};

export function RecordsToolbar({
  newLabel,
  onCreate,
  onDeleteSelected,
  onExportAll,
  onExportSelected,
  onImport,
  onSearchChange,
  onToggleSelectionMode,
  readOnly,
  search,
  selectedCount,
  selectionMode,
  title
}: RecordsToolbarProps) {
  return (
    <PanelHeader className="gap-1.5">
      <h1 className="mr-1 shrink-0 truncate text-[12px] font-bold text-cms-text">{title}</h1>
      <SearchInput className="w-[240px] max-w-full" onChange={onSearchChange} placeholder={`Search ${title.toLowerCase()}...`} value={search} />

      {selectionMode ? (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="px-1 text-[11px] text-cms-muted">{selectedCount} selected</span>
          <Button disabled={selectedCount === 0} onClick={onExportSelected} type="button">
            <Download size={16} />
            Export selected
          </Button>
          <Button disabled={selectedCount === 0} onClick={onDeleteSelected} type="button">
            <Trash2 size={16} />
            Delete selected
          </Button>
          <Button onClick={onToggleSelectionMode} type="button">
            <X size={16} />
            Done
          </Button>
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-1.5">
          <Button onClick={onToggleSelectionMode} type="button">
            <CheckSquare size={16} />
            Select...
          </Button>
          <Button onClick={onExportAll} type="button">
            <Download size={16} />
            Export
          </Button>
          {readOnly ? null : (
            <>
              <Button onClick={onImport} type="button">
                <Upload size={16} />
                Import
              </Button>
              <Button onClick={onCreate} type="button" variant="primary">
                <Plus size={16} />
                New {newLabel}
              </Button>
            </>
          )}
        </div>
      )}
    </PanelHeader>
  );
}
