import type { CmsCollection, CmsRecord, CmsRecordValue } from "../cms/types";
import { toCsv } from "./csv";
import { hasPublishWorkflow } from "./records";

export function recordsToCsv(collection: CmsCollection, records: CmsRecord[]): string {
  const fieldKeys = collection.fields.map((field) => field.key);
  const publishable = hasPublishWorkflow(collection);
  const headers = ["id", ...(publishable ? ["publishStatus"] : []), "createdAt", "modifiedAt", ...fieldKeys];
  // Pass raw values (not pre-stringified) so escapeCsvCell can tell a
  // genuinely numeric cell apart from a string that merely looks like one.
  const rows: CmsRecordValue[][] = records.map((record) => [
    record.id,
    ...(publishable ? [record.publishStatus] : []),
    record.createdAt,
    record.modifiedAt,
    ...fieldKeys.map((key) => record.values[key])
  ]);

  return toCsv(headers, rows);
}

function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportTimestamp(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `${date}-${time}`;
}

export function exportRecords(collection: CmsCollection, records: CmsRecord[]): void {
  downloadCsv(`${collection.id}-${exportTimestamp()}.csv`, recordsToCsv(collection, records));
}
