import { CheckSquare, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { Toolbar } from "@base-ui-components/react/toolbar";
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

// Base UI Toolbar: one tab stop for the whole strip, with arrow keys moving
// between the search field and the record actions.
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
    <PanelHeader className="gap-1.5" render={<Toolbar.Root aria-label={`${title} actions`} />}>
      <h1 className="mr-1 shrink-0 truncate text-ui-lg font-semibold text-cms-text">{title}</h1>
      <SearchInput
        className="w-55 max-w-full"
        inputRender={<Toolbar.Input />}
        onChange={onSearchChange}
        placeholder={`Search ${title.toLowerCase()}…`}
        value={search}
      />

      {selectionMode ? (
        <Toolbar.Group className="ml-auto flex items-center gap-1.5">
          <span className="px-1 text-ui tabular-nums text-cms-subtle">{selectedCount} selected</span>
          <Button disabled={selectedCount === 0} onClick={onExportSelected} render={<Toolbar.Button />}>
            <Download size={13} />
            Export selected
          </Button>
          <Button disabled={selectedCount === 0} onClick={onDeleteSelected} render={<Toolbar.Button />}>
            <Trash2 size={13} />
            Delete selected
          </Button>
          <Button onClick={onToggleSelectionMode} render={<Toolbar.Button />}>
            <X size={13} />
            Done
          </Button>
        </Toolbar.Group>
      ) : (
        <Toolbar.Group className="ml-auto flex items-center gap-1.5">
          <Button onClick={onToggleSelectionMode} render={<Toolbar.Button />}>
            <CheckSquare size={13} />
            Select
          </Button>
          <Button onClick={onExportAll} render={<Toolbar.Button />}>
            <Download size={13} />
            Export
          </Button>
          {readOnly ? null : (
            <>
              <Toolbar.Separator className="mx-0.5 h-4 w-px shrink-0 bg-cms-line-strong" />
              <Button onClick={onImport} render={<Toolbar.Button />}>
                <Upload size={13} />
                Import
              </Button>
              <Button onClick={onCreate} render={<Toolbar.Button />} variant="primary">
                <Plus size={13} />
                New {newLabel}
              </Button>
            </>
          )}
        </Toolbar.Group>
      )}
    </PanelHeader>
  );
}
