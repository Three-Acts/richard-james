export type CmsErrorCode =
  | "not_found"
  | "validation"
  | "conflict"
  | "forbidden"
  | "unauthorized"
  | "readonly"
  | "unavailable"
  | "unknown";

/**
 * Typed failure shared by every adapter and by the API's `/api/cms/*` routes.
 * The API returns `code` inside its error envelope; the REST adapter turns it
 * back into a `CmsError` so the UI logic is backend-agnostic.
 */
export class CmsError extends Error {
  readonly code: CmsErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: CmsErrorCode, message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "CmsError";
    this.code = code;
    this.status = options?.status ?? statusForCode(code);
    this.details = options?.details;
  }
}

export function statusForCode(code: CmsErrorCode): number {
  switch (code) {
    case "not_found":
      return 404;
    case "validation":
      return 400;
    case "conflict":
      return 409;
    case "forbidden":
    case "readonly":
      return 403;
    case "unauthorized":
      return 401;
    case "unavailable":
      return 503;
    default:
      return 500;
  }
}

export function isCmsError(value: unknown): value is CmsError {
  return value instanceof CmsError || (typeof value === "object" && value !== null && (value as { name?: string }).name === "CmsError");
}
