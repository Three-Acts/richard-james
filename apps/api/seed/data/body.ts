import type { ContentBlock } from "./types"

/**
 * Serialises `aboutBlocks`/`essayBlocks` into the `pages.body` lightweight
 * markdown described in the content contract (see
 * `packages/cms-schema/src/content-contract.ts` `PageContent.body`):
 *
 *   "# "  h1
 *   "## " h2
 *   "### " h3
 *   "- "  list item
 *   (anything else) paragraph
 *
 * Blocks are separated by a blank line, except that consecutive list items
 * are NOT separated (they read as one contiguous list). Each block's `text`
 * is a single line — none of the seed content embeds a line break inside a
 * block. The inverse, `parsePageBody`, lives in `apps/web/src/content/body.ts`
 * (used by about.astro/essay.astro to render the published body back out) —
 * kept in sync by the round-trip test at `apps/web/scripts/test-content-body.ts`.
 */

function lineFor(block: ContentBlock): string {
  switch (block.tag) {
    case "h1":
      return `# ${block.text}`
    case "h2":
      return `## ${block.text}`
    case "h3":
      return `### ${block.text}`
    case "li":
      return `- ${block.text}`
    default:
      return block.text
  }
}

/** `ContentBlock[]` -> the `pages.body` markdown string. */
export function blocksToBody(blocks: ContentBlock[]): string {
  const lines: string[] = []

  blocks.forEach((block, i) => {
    const prev = blocks[i - 1]
    const bothListItems = prev?.tag === "li" && block.tag === "li"
    if (i > 0 && !bothListItems) lines.push("")
    lines.push(lineFor(block))
  })

  return lines.join("\n")
}
