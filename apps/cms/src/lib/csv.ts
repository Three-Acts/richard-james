// Minimal dependency-free CSV parse/serialize. Handles quoted fields,
// embedded commas/newlines, and escaped double-quotes ("").

const BOM = "﻿";

export type CsvTable = {
  headers: string[];
  rows: Array<Record<string, string>>;
  warnings: string[];
};

function parseRows(text: string): string[][] {
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  // Drop a trailing empty row produced by a final newline.
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }

  return rows;
}

/** De-dupes and names headers so no two columns collide when built into a row object. */
function normalizeHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>();

  return rawHeaders.map((rawHeader, index) => {
    const trimmed = rawHeader.trim();
    const base = trimmed || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

export function parseCsv(text: string): CsvTable {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = parseRows(withoutBom);

  if (records.length === 0) {
    return { headers: [], rows: [], warnings: [] };
  }

  const headers = normalizeHeaders(records[0]);
  const warnings: string[] = [];
  const rows = records
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells, index) => {
      if (cells.length > headers.length) {
        warnings.push(`Row ${index + 2} has ${cells.length} cells but there are only ${headers.length} columns; extra cells were ignored.`);
      }

      const row: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        row[header] = cells[headerIndex] ?? "";
      });
      return row;
    });

  return { headers, rows, warnings };
}

const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }

  const text = value === null || value === undefined ? "" : String(value);
  // Neutralize formula injection: a leading =, +, -, @, tab, or CR would be
  // interpreted as a formula by Excel/Sheets when the cell is opened.
  const safe = RISKY_PREFIX.test(text) ? `'${text}` : text;

  return /["\r\n,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const body = [headers, ...rows].map((cells) => cells.map(escapeCsvCell).join(",")).join("\n");
  return `${BOM}${body}`;
}
