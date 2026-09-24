// All stored datetime values are ISO 8601 UTC strings (with a trailing "Z") or "".

export function formatDateTime(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    // Unparseable input (e.g. a bad import). Show the raw value rather than
    // letting Intl.DateTimeFormat throw a RangeError and white-screen the table.
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

/** Local wall-clock "YYYY-MM-DDTHH:mm" for an <input type="datetime-local">. */
export function toDateTimeLocal(iso: string): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Inverse of toDateTimeLocal: a local "YYYY-MM-DDTHH:mm[:ss]" string to a UTC ISO string. */
export function fromDateTimeLocal(local: string): string {
  if (!local) {
    return "";
  }

  const date = new Date(local);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

/** Best-effort import coercion: parses if it can, otherwise keeps the original text so the editor can surface it. */
export function normalizeDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const text = String(value);
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const parsed = Date.parse(trimmed);

  return Number.isNaN(parsed) ? text : new Date(parsed).toISOString();
}

export function singularize(label: string) {
  return label.endsWith("s") ? label.slice(0, -1) : label;
}
