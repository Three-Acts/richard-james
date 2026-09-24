import assert from 'node:assert/strict'
import { parsePageBody } from '../src/content/body.ts'

/**
 * `parsePageBody` parses the `pages.body` lightweight markdown that the API
 * serves (written by `apps/api/scripts/seed.ts` via `blocksToBody` in
 * `apps/api/seed/data/body.ts` — the web app no longer holds a writer for it,
 * since all content comes from the API). This exercises every tag and the
 * blank-line handling directly against hand-written markdown.
 */
const body = [
  '# Title',
  '',
  'First paragraph.',
  '',
  '## Section',
  '',
  'Second paragraph.',
  '',
  '### Subheading',
  '',
  '- Reference one.',
  '- Reference two.',
  '- Reference three.',
  '',
].join('\n')

const expected = [
  { tag: 'h1', text: 'Title' },
  { tag: 'p', text: 'First paragraph.' },
  { tag: 'h2', text: 'Section' },
  { tag: 'p', text: 'Second paragraph.' },
  { tag: 'h3', text: 'Subheading' },
  { tag: 'li', text: 'Reference one.' },
  { tag: 'li', text: 'Reference two.' },
  { tag: 'li', text: 'Reference three.' },
]

assert.deepEqual(parsePageBody(body), expected)

// Blank lines are pure separators — parsing is unaffected by whether they're
// present between any given pair of blocks (e.g. between list items, which
// the writer on the seed side never inserts one between).
assert.deepEqual(parsePageBody(body.replace(/\n\n/g, '\n')), expected)

console.log('content body parse test passed')
