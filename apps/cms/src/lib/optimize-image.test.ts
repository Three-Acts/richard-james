// Unit tests for the DOM-free math behind optimize-image.ts. Run directly
// with Node's TypeScript support — no bundler, no browser, no test
// framework beyond the built-in `node:test`:
//
//   node --experimental-strip-types --test src/lib/optimize-image.test.ts
//
// Deliberately imports from image-dimensions.ts, not optimize-image.ts:
// the latter pulls in `../cms/types` (a workspace package) and eventually
// `@jsquash/avif`, neither of which plain Node's ESM resolver — no bundler
// here — can follow. image-dimensions.ts has zero imports, so it loads and
// runs directly under Node's type-stripping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeImage, targetDimensions } from "./image-dimensions.ts";

test("targetDimensions leaves an image already under the limit unchanged", () => {
  assert.deepEqual(targetDimensions(1200, 800, 1920), { width: 1200, height: 800 });
});

test("targetDimensions never upscales a smaller image", () => {
  assert.deepEqual(targetDimensions(400, 300, 1920), { width: 400, height: 300 });
});

test("targetDimensions downscales a landscape image to the long edge", () => {
  assert.deepEqual(targetDimensions(3840, 2160, 1920), { width: 1920, height: 1080 });
});

test("targetDimensions downscales a portrait image by height, not width", () => {
  assert.deepEqual(targetDimensions(2160, 3840, 1920), { width: 1080, height: 1920 });
});

test("targetDimensions treats an exact match at the limit as already within range", () => {
  assert.deepEqual(targetDimensions(1920, 1080, 1920), { width: 1920, height: 1080 });
});

test("targetDimensions rounds fractional results to whole pixels", () => {
  assert.deepEqual(targetDimensions(3000, 1999, 1920), { width: 1920, height: 1279 });
});

test("targetDimensions respects a custom max long edge", () => {
  assert.deepEqual(targetDimensions(2000, 1000, 800), { width: 800, height: 400 });
});

test("targetDimensions never returns a zero dimension for an extreme aspect ratio", () => {
  const result = targetDimensions(10000, 1, 1920);
  assert.equal(result.width, 1920);
  assert.ok(result.height >= 1);
});

test("targetDimensions passes through non-positive input without dividing by zero", () => {
  assert.deepEqual(targetDimensions(0, 0, 1920), { width: 0, height: 0 });
});

test("looksLikeImage trusts a browser-provided image/* MIME type", () => {
  assert.equal(looksLikeImage({ type: "image/png", name: "photo.dat" } as File), true);
});

test("looksLikeImage rejects a non-image MIME type even with an image-like name", () => {
  assert.equal(looksLikeImage({ type: "application/pdf", name: "photo.png" } as File), false);
});

test("looksLikeImage falls back to the file extension when the MIME type is empty", () => {
  assert.equal(looksLikeImage({ type: "", name: "photo.JPG" } as File), true);
  assert.equal(looksLikeImage({ type: "", name: "notes.txt" } as File), false);
});
