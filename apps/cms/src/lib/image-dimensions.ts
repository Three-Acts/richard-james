// Pure, dependency-free helpers for optimize-image.ts, split into their own
// module so they can be unit-tested directly under plain Node (no bundler,
// no DOM) — see optimize-image.test.ts. Keep this file free of any import
// that isn't itself Node-resolvable without a bundler.

export type Dimensions = { width: number; height: number };

/**
 * Pure scaling math: shrinks `width`/`height` so the longer edge is at most
 * `maxLongEdge`, preserving aspect ratio, and never upscales a smaller
 * image.
 */
export function targetDimensions(width: number, height: number, maxLongEdge: number): Dimensions {
  const rounded = { width: Math.round(width), height: Math.round(height) };

  if (width <= 0 || height <= 0) {
    return rounded;
  }

  const longEdge = Math.max(width, height);

  if (longEdge <= maxLongEdge) {
    return rounded;
  }

  const scale = maxLongEdge / longEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

/** Whether `file` should be treated as a raster image worth optimising at all (as opposed to a video/PDF/other asset). */
export function looksLikeImage(file: File): boolean {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  // Some drag-and-drop sources (notably Safari for local files) leave
  // `file.type` empty — fall back to the extension rather than assuming
  // "not an image" and silently skipping optimisation.
  return /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|heic|heif)$/i.test(file.name);
}
