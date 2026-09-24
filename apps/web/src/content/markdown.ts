import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

/**
 * Renders the GitHub-flavoured markdown (plus `<u>` for underline) that the
 * content API's markdown fields use — `PageContent.body`,
 * `ProjectContent.description` (see
 * `packages/cms-schema/src/content-contract.ts`) — to sanitised HTML for
 * `set:html`, at build time.
 *
 * `marked` parses headings, lists, bold/italic/strikethrough, links and
 * blockquotes (GFM), and passes recognised inline HTML — just `<u>` here —
 * straight through; `sanitize-html` then allowlists exactly the tags/
 * attributes the prose styles in global.css (`.prose-body`) know how to
 * render, so nothing an editor pastes in can inject arbitrary markup.
 */
marked.setOptions({ gfm: true, breaks: false })

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "a",
  "strong",
  "em",
  "u",
  "s",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "hr",
  "code",
  "pre"
]

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"]
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ["http", "https", "mailto"],
  // Every link opens safely in a new tab regardless of what the editor wrote.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
  }
}

/** Markdown -> sanitised HTML, ready for `set:html`. */
export function renderMarkdown(markdown: string): string {
  if (!markdown.trim()) return ""
  const html = marked.parse(markdown, { async: false })
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/** Markdown -> plain text (tags stripped, whitespace collapsed) — for meta descriptions and JSON-LD. */
export function stripMarkdownToText(markdown: string): string {
  const html = renderMarkdown(markdown)
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
}
