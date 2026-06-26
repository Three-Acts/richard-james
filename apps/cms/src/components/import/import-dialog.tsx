import { useState } from "react";
import type { ChangeEvent } from "react";
import { FileText, Upload } from "lucide-react";
import type { CmsCollectionSummary, CmsRecordValue } from "../../cms/types";
import { parseCsv, type CsvTable } from "../../lib/csv";
import { Button, buttonVariants, Modal, Select } from "../atoms";

const IGNORE = "";

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
  onClose: () => void;
  onImport: (rows: Array<Record<string, CmsRecordValue>>) => void | Promise<void>;
};

export function ImportDialog({ collection, onClose, onImport }: ImportDialogProps) {
  const [table, setTable] = useState<CsvTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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

        if (header) {
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

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  const footer = table ? (
    <>
      <Button onClick={onClose} type="button">
        Cancel
      </Button>
      <Button disabled={isImporting || mappedCount === 0} onClick={handleImport} type="button" variant="primary">
        {isImporting ? "Importing..." : `Import ${table.rows.length} rows`}
      </Button>
    </>
  ) : (
    <Button onClick={onClose} type="button">
      Cancel
    </Button>
  );

  return (
    <Modal footer={footer} onClose={onClose} open title={`Import into ${collection.label}`}>
      {error ? <p className="mb-3 rounded border border-red-900 bg-red-950 px-2 py-1.5 text-red-100">{error}</p> : null}

      {table ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-cms-muted">
            <FileText size={16} />
            <span className="truncate">{fileName}</span>
            <span>
              · {table.rows.length} rows · {table.headers.length} columns
            </span>
          </div>
          <p className="text-cms-muted">Map each field to a column from your file.</p>
          <div className="grid gap-2">
            {collection.fields.map((field) => (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-2" key={field.key}>
                <span className="truncate text-cms-text">{field.label}</span>
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
        <div className="grid place-items-center gap-3 py-8 text-center">
          <p className="text-cms-muted">Choose a CSV file to import records into this collection.</p>
          <label className={buttonVariants({ variant: "primary" })}>
            <Upload size={16} />
            Choose CSV file
            <input accept=".csv,text/csv" className="sr-only" onChange={handleFile} type="file" />
          </label>
        </div>
      )}
    </Modal>
  );
}
