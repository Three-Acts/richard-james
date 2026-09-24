import assert from 'node:assert/strict'
import { renderMarkdown, stripMarkdownToText } from '../src/content/markdown.ts'

/**
 * `renderMarkdown` covers the GFM subset the content API's markdown fields
 * use (headings, lists, bold/italic/strikethrough, links, blockquotes) plus
 * `<u>` passthrough for underline, and sanitises everything else away.
 */

// Headings.
assert.equal(renderMarkdown('# Title').trim(), '<h1>Title</h1>')
assert.equal(renderMarkdown('## Section').trim(), '<h2>Section</h2>')
assert.equal(renderMarkdown('### Subheading').trim(), '<h3>Subheading</h3>')

// Paragraphs — a blank line between two lines of text is a new paragraph,
// matching how plain-text descriptions used to read.
assert.equal(
  renderMarkdown('First paragraph.\n\nSecond paragraph.').trim(),
  '<p>First paragraph.</p>\n<p>Second paragraph.</p>',
)

// Lists.
assert.equal(renderMarkdown('- One\n- Two\n- Three').trim(), '<ul>\n<li>One</li>\n<li>Two</li>\n<li>Three</li>\n</ul>')
assert.equal(renderMarkdown('1. One\n2. Two').trim(), '<ol>\n<li>One</li>\n<li>Two</li>\n</ol>')

// Bold, italic, strikethrough, links, blockquote.
assert.equal(renderMarkdown('**bold**').trim(), '<p><strong>bold</strong></p>')
assert.equal(renderMarkdown('*italic*').trim(), '<p><em>italic</em></p>')
assert.equal(renderMarkdown('~~struck~~').trim(), '<p><del>struck</del></p>')
assert.equal(
  renderMarkdown('[a link](https://example.com)').trim(),
  '<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">a link</a></p>',
)
assert.equal(renderMarkdown('> a quote').trim(), '<blockquote>\n<p>a quote</p>\n</blockquote>')

// `<u>` passes through for underline (not native markdown syntax).
assert.equal(renderMarkdown('plain <u>underlined</u> text').trim(), '<p>plain <u>underlined</u> text</p>')

// Anything else is sanitised away — no script injection via authored content.
assert.ok(!renderMarkdown('<script>alert(1)</script>text').includes('<script'))
assert.ok(!renderMarkdown('<img src=x onerror=alert(1)>').includes('onerror'))

// Plain-text stripping for meta descriptions / JSON-LD.
assert.equal(stripMarkdownToText('**Bold** and _stuff_.\n\nAnother paragraph.'), 'Bold and stuff. Another paragraph.')
assert.equal(stripMarkdownToText(''), '')

console.log('markdown render test passed')
