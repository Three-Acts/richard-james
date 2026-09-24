import assert from 'node:assert/strict'
import { WheelClassifier, resolveSnap } from '../src/lib/carousel/wheel.ts'

/**
 * Unit tests for the pure wheel helpers (the only part of the carousel core
 * that is not GSAP-owned). The lerp loop, drag momentum and snapping live in
 * gsap.ticker/Draggable/InertiaPlugin and are exercised in the browser.
 */

/* ---------------------------- classification ---------------------------- */

// A trackpad stream is a stream from the first event.
{
  const c = new WheelClassifier()
  assert.equal(c.classify({ delta: 5, time: 1, discrete: false }), 'stream')
  assert.equal(c.classify({ delta: 25, time: 17, discrete: false }), 'stream')
  assert.equal(c.classify({ delta: 40, time: 33, discrete: false }), 'stream')
}

// A discrete mouse notch is one deliberate step, immediately.
{
  const c = new WheelClassifier()
  assert.equal(c.classify({ delta: 80, time: 1, discrete: true }), 'notch')
  // A follow-up faster than a hand can click folds into the step in flight…
  assert.equal(c.classify({ delta: 80, time: 20, discrete: true }), 'ignore')
  // …while a real second notch is its own step.
  assert.equal(c.classify({ delta: 80, time: 220, discrete: true }), 'notch')
}

// Large isolated pixel-mode deltas read as notches too (classic mice on
// Chrome), but a burst that turns continuous is reclassified as a trackpad.
{
  const c = new WheelClassifier()
  assert.equal(c.classify({ delta: 90, time: 1, discrete: false }), 'notch')
  assert.equal(c.classify({ delta: 25, time: 17, discrete: false }), 'stream')
}

// After a quiet gap the device is classified afresh: a big isolated delta
// following an old stream is a notch again.
{
  const c = new WheelClassifier()
  assert.equal(c.classify({ delta: 10, time: 1, discrete: false }), 'stream')
  assert.equal(c.classify({ delta: 100, time: 500, discrete: false }), 'notch')
}

// Zero deltas never act.
{
  const c = new WheelClassifier()
  assert.equal(c.classify({ delta: 0, time: 1, discrete: false }), 'ignore')
}

/* ------------------------------- snapping ------------------------------- */

const LAST = 5

// Travelling forward: offsets past the threshold belong to the next step.
assert.equal(resolveSnap(3.4, 1, 0.5, LAST), 3)
assert.equal(resolveSnap(3.6, 1, 0.5, LAST), 4)

// Travelling backward is the exact mirror.
assert.equal(resolveSnap(3.7, -1, 0.5, LAST), 4)
assert.equal(resolveSnap(3.3, -1, 0.5, LAST), 3)

// A lower threshold is more eager in the direction of travel.
assert.equal(resolveSnap(3.25, 1, 0.22, LAST), 4)
assert.equal(resolveSnap(3.75, -1, 0.22, LAST), 3)

// No direction (programmatic) → nearest.
assert.equal(resolveSnap(3.4, 0, 0.5, LAST), 3)
assert.equal(resolveSnap(3.6, 0, 0.5, LAST), 4)

// Whole steps are stable regardless of direction.
assert.equal(resolveSnap(4, 1, 0.5, LAST), 4)
assert.equal(resolveSnap(4, -1, 0.5, LAST), 4)
assert.equal(resolveSnap(4, 1, 0.22, LAST), 4)

// Out-of-range positions (edge rubber-band) resolve to the boundary steps.
assert.equal(resolveSnap(-0.12, -1, 0.5, LAST), 0)
assert.equal(resolveSnap(5.12, 1, 0.5, LAST), 5)

// Single-item list is always index 0.
assert.equal(resolveSnap(0.4, 1, 0.5, 0), 0)

console.log('carousel wheel tests passed')
