import { useState } from "react";
import type { ChangeEvent } from "react";
import { FileText, Upload } from "lucide-react";
import type { CmsCollectionSummary, CmsRecordValue } from "../../cms/types";
import { parseCsv, type CsvTable } from "../../lib/csv";
import { cn } from "@three-acts/utils";
import { Button, buttonVariants, fileLabelFocusRing, Modal, Select } from "../atoms";

// Never a real CSV header, so a blank or coincidentally-empty column can't be
// mistaken for "ignore this field" (and doesn't collide with it as a value).
const IGNORE = "__ignore__";

function autoMap(headers: string[], collection: CmsCollectionSummary): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const field of collection.fields) {
    const match = headers.find(
      (header) => header.toLowerCase() === field.key.toLowerCase() || header.toLowerCase() === field.label.toLowerCase()
    );
    mapping[field.key] = match ?? IGNORE;
  }

  return mapping;
}

type ImportDialogProps = {
  collection: CmsCollectionSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Array<Record<string, CmsRecordValue>>) => void | Promise<void>;
};

export function ImportDialog({ collection, open, onOpenChange, onImport }: ImportDialogProps) {
  const [table, setTable] = useState<CsvTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // The dialog stays mounted between opens, so its own state has to be reset
  // by hand each time it's reopened. Adjusting state during render (rather
  // than in an effect) avoids an extra render pass: React re-renders
  // immediately when it sees state change while rendering.
  if (open !== prevOpen) {
    setPrevOpen(open);

    if (open) {
      setTable(null);
      setFileName("");
      setMapping({});
      setError(null);
      setIsImporting(false);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file.");
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));

      if (parsed.headers.length === 0) {
        setError("That file has no columns.");
        return;
      }

      setError(null);
      setTable(parsed);
      setFileName(file.name);
      setMapping(autoMap(parsed.headers, collection));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function buildRows(): Array<Record<string, CmsRecordValue>> {
    if (!table) {
      return [];
    }

    return table.rows.map((row) => {
      const next: Record<string, CmsRecordValue> = {};

      for (const field of collection.fields) {
        const header = mapping[field.key];

        if (header && header !== IGNORE) {
          next[field.key] = row[header] ?? "";
        }
      }

      return next;
    });
  }

  async function handleImport() {
    if (!table) {
      return;
    }

    setIsImporting(true);

    try {
      await onImport(buildRows());
    } finally {
      setIsImporting(false);
    }
  }

  const mappedCount = Object.values(mapping).filter((header) => header && header !== IGNORE).length;
  const rowCount = table?.rows.length ?? 0;

  const footer = table ? (
    <>
      <Button onClick={() => onOpenChange(false)} type="button">
        Cancel
      </Button>
      <Button disabled={isImporting || mappedCount === 0 || rowCount === 0} onClick={handleImport} type="button" variant="primary">
        {isImporting ? "Importing…" : `Import ${rowCount} ${rowCount === 1 ? "row" : "rows"}`}
      </Button>
    </>
  ) : (
    <Button onClick={() => onOpenChange(false)} type="button">
      Cancel
    </Button>
  );

  return (
    <Modal footer={footer} onClose={() => onOpenChange(false)} open={open} title={`Import into ${collection.label}`}>
      {error ? (
        <p className="mb-3 rounded-cms border border-cms-danger-line bg-cms-danger-surface px-2 py-1.5 text-cms-danger" role="alert">
          {error}
        </p>
      ) : null}

      {table ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-cms-muted">
            <FileText size={14} />
            <span className="truncate font-medium text-cms-text">{fileName}</span>
            <span className="tabular-nums text-cms-subtle">
              {table.rows.length} rows · {table.headers.length} columns
            </span>
          </div>
          {table.warnings.length > 0 ? (
            <ul className="m-0 grid gap-0.5 pl-4 text-cms-subtle">
              {table.warnings.map((warning, index) => (
                <li key={`${index}-${warning}`}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <p className="m-0 text-cms-subtle">Match each Collection Field to a column from your file.</p>
          <div className="grid gap-2">
            {collection.fields.map((field) => (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-2" key={field.key}>
                <span className="truncate text-cms-muted">{field.label}</span>
                <Select
                  onValueChange={(next) => setMapping((current) => ({ ...current, [field.key]: next }))}
                  options={[{ label: "— Ignore —", value: IGNORE }, ...table.headers.map((header) => ({ label: header, value: header }))]}
                  value={mapping[field.key] ?? IGNORE}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid place-items-center gap-3 py-10 text-center">
          <p className="m-0 max-w-[280px] text-cms-subtle">Pick a CSV file, then match its columns to this collection&rsquo;s fields.</p>
          <label className={cn(buttonVariants({ size: "md", variant: "primary" }), "cursor-pointer", fileLabelFocusRing)}>
            <Upload size={14} />
            Choose CSV file
            <input accept=".csv,text/csv" className="sr-only" onChange={handleFile} type="file" />
          </label>
        </div>
      )}
    </Modal>
  );
}
