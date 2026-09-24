/** A single parsed block of a `pages.body` markdown string (see `parsePageBody` below). */
export type ContentBlock = {
  /** Original semantic tag: h1 | h2 | h3 | p | li */
  tag: string
  text: string
}

/**
 * Parses the `pages` collection's `body` field — the lightweight markdown
 * described in the content contract (see
 * `packages/cms-schema/src/content-contract.ts` `PageContent.body`):
 *
 *   "# "  h1
 *   "## " h2
 *   "### " h3
 *   "- "  list item
 *   (anything else) paragraph
 *
 * Used by about.astro/essay.astro to render the published body. The inverse,
 * `blocksToBody`, lives in `apps/api/seed/data/body.ts` (the seed script
 * serialises `aboutBlocks`/`essayBlocks` into this same format) — kept in
 * sync by the round-trip test at `scripts/test-content-body.ts`.
 */
export function parsePageBody(body: string): ContentBlock[] {
  const blocks: ContentBlock[] = []

  for (const line of body.split("\n")) {
    if (line.trim() === "") continue // blank separator line

    if (line.startsWith("### ")) blocks.push({ tag: "h3", text: line.slice(4) })
    else if (line.startsWith("## ")) blocks.push({ tag: "h2", text: line.slice(3) })
    else if (line.startsWith("# ")) blocks.push({ tag: "h1", text: line.slice(2) })
    else if (line.startsWith("- ")) blocks.push({ tag: "li", text: line.slice(2) })
    else blocks.push({ tag: "p", text: line })
  }

  return blocks
}
