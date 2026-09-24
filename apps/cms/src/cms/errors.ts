import { isCmsError } from "./types";

/**
 * Turns any thrown value into user-facing copy. Every `catch` in the
 * workspace hook should go through this instead of
 * `error instanceof Error ? error.message : ...` so a `CmsError`'s code — not
 * just its message — decides what the editor sees.
 */
export function describeCmsError(error: unknown): string {
  if (isCmsError(error)) {
    switch (error.code) {
      case "conflict":
        return "This record was changed elsewhere. Reload it to see the latest version before saving again.";
      case "not_found":
        return "That record no longer exists. It may have been deleted elsewhere.";
      case "readonly":
        return error.message || "This collection is read-only.";
      case "validation":
        return error.message || "Some fields need attention before this can be saved.";
      case "forbidden":
      case "unauthorized":
        return "You don't have permission to do that.";
      case "unavailable":
        return "The API is unavailable right now. Try again shortly.";
      case "unknown":
      default:
        return error.message || "Something went wrong.";
    }
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}
