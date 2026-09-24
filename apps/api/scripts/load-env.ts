/**
 * Loads `.env`-style files into `process.env` with Node's built-in
 * `process.loadEnvFile` (Node >= 20.6; no extra dependency). A file that
 * doesn't exist (or can't be read) is silently ignored — env may already be
 * populated by the shell, CI, or Vercel.
 *
 * Node's loader does not overwrite a key already present in `process.env`,
 * so callers pass paths in priority order: whichever file sets a key first
 * wins.
 */
export function loadEnvFiles(paths: string[]): void {
  for (const path of paths) {
    try {
      process.loadEnvFile(path);
    } catch {
      // Missing/unreadable file — fine.
    }
  }
}
