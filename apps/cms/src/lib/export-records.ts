import type { CmsCollection, CmsRecord, CmsRecordValue } from "../cms/types";
import { toCsv } from "./csv";

function formatCell(value: CmsRecordValue): string {
  return value === null || value === undefined ? "" : String(value);
}

export function recordsToCsv(collection: CmsCollection, records: CmsRecord[]): string {
  const fieldKeys = collection.fields.map((field) => field.key);
  const headers = ["id", "publishStatus", "createdAt", "modifiedAt", ...fieldKeys];
  const rows = records.map((record) => [
    record.id,
    record.publishStatus,
    record.createdAt,
    record.modifiedAt,
    ...fieldKeys.map((key) => formatCell(record.values[key]))
  ]);

  return toCsv(headers, rows);
}

function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRecords(collection: CmsCollection, records: CmsRecord[]): void {
  downloadCsv(`${collection.id}-${records.length}.csv`, recordsToCsv(collection, records));
}
