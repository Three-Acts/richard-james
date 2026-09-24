/**
 * Normalizes markdown for *comparison* only — never for storage. A richtext
 * editor round-trips its value through a document model, and re-serialising
 * unchanged content can come back with different leading/trailing
 * whitespace, `\r\n` line endings, or a different run of blank lines, none
 * of which is a real edit. Comparing raw strings would flag a record as
 * dirty (or two equal values as different) for no user-visible reason.
 */
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
