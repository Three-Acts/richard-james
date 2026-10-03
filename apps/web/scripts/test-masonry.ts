import assert from 'node:assert/strict'
import { calculateMasonry } from '../src/lib/masonry.ts'

// Mixed image heights should fill the shorter column instead of reserving full grid rows.
assert.deepEqual(calculateMasonry([300, 100, 160, 80, 240], 2, 32), {
  items: [
    { column: 0, top: 0 },
    { column: 1, top: 0 },
    { column: 1, top: 132 },
    { column: 1, top: 324 },
    { column: 0, top: 332 },
  ],
  height: 572,
})

// The same images form a single continuous column on mobile, including their captions.
assert.deepEqual(calculateMasonry([300, 100, 160], 1, 24), {
  items: [{ column: 0, top: 0 }, { column: 0, top: 324 }, { column: 0, top: 448 }],
  height: 608,
})

// Equal heights keep left-to-right reading order, without an extra gap below the final image.
assert.deepEqual(calculateMasonry([100, 100, 100, 100], 2, 32), {
  items: [{ column: 0, top: 0 }, { column: 1, top: 0 }, { column: 0, top: 132 }, { column: 1, top: 132 }],
  height: 232,
})
assert.deepEqual(calculateMasonry([], 2, 32), { items: [], height: 0 })
assert.deepEqual(calculateMasonry([180], 2, 32), { items: [{ column: 0, top: 0 }], height: 180 })

console.log('masonry packing tests passed')
