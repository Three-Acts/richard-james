// Client-side image optimisation, run before a picked/dropped file ever
// enters the upload pipeline (see `useCmsWorkspace`'s asset/gallery pick
// handlers). Everything here executes in the browser: decode (honouring
// EXIF orientation), downscale so the long edge is at most `maxLongEdge`,
// and re-encode to AVIF — falling back to WebP, then the original file, if
// AVIF encoding isn't available. Nothing here talks to the network; the
// optimised `File` is just handed back for the caller to stage/upload.
import { MAX_ASSET_UPLOAD_BYTES } from "../cms/types";
import { targetDimensions } from "./image-dimensions";

export { targetDimensions, looksLikeImage } from "./image-dimensions";
export type { Dimensions } from "./image-dimensions";

export const DEFAULT_MAX_LONG_EDGE = 1920;

const AVIF_QUALITY = 60;
const AVIF_SPEED = 7;
const CANVAS_AVIF_QUALITY = 0.6;
const CANVAS_WEBP_QUALITY = 0.8;

function isSvg(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

function isAvif(file: File): boolean {
  return file.type === "image/avif" || /\.avif$/i.test(file.name);
}

function replaceExtension(fileName: string, extension: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${base}.${extension}`;
}

/** Thrown when a file can't be brought under the upload limit even after optimisation. */
export class ImageOptimizationError extends Error {}

export type OptimizeImageResult = {
  file: File;
  originalSize: number;
  finalSize: number;
  /** True when the file was handed back unchanged (SVG, already-optimal AVIF, or no encoder could produce a smaller result). */
  skipped: boolean;
};

type AvifEncode = (data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer>;

let avifEncoderPromise: Promise<AvifEncode | null> | null = null;

/**
 * Lazily loads `@jsquash/avif`'s WASM encoder on first use, pointing its
 * emscripten glue code at the `.wasm` binaries through explicit `?url`
 * imports. Without this, the glue code resolves the `.wasm` path relative
 * to its own `import.meta.url` — which happens to work in dev (Vite serves
 * node_modules straight off disk) but breaks in a production build, where
 * the `.wasm` file is never copied next to the bundled chunk unless
 * something references it as an asset. `?url` makes Vite treat it as one
 * (copied into the build, hashed, lazy-loaded alongside this chunk).
 */
async function loadAvifEncoder(): Promise<AvifEncode | null> {
  if (typeof WebAssembly === "undefined") {
    return null;
  }

  if (!avifEncoderPromise) {
    avifEncoderPromise = (async () => {
      try {
        const [encoderModule, wasmUrl, wasmMtUrl] = await Promise.all([
          import("@jsquash/avif/encode.js"),
          import("@jsquash/avif/codec/enc/avif_enc.wasm?url"),
          import("@jsquash/avif/codec/enc/avif_enc_mt.wasm?url")
        ]);

        // Whichever glue module the encoder ends up loading (single- or
        // multi-threaded — decided internally based on cross-origin
        // isolation support), it asks `locateFile` for exactly one `.wasm`
        // by name; route each to its matching pre-resolved asset URL.
        await encoderModule.init({
          locateFile: (path: string) => (path.includes("_mt") ? wasmMtUrl.default : wasmUrl.default)
        });

        return encoderModule.default;
      } catch {
        return null;
      }
    })();
  }

  return avifEncoderPromise;
}

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
type Context2DLike = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Encodes `canvas`'s current contents to `mimeType`, resolving `null` if the browser can't (some silently substitute a different format instead of failing, so the result's own `type` is checked). */
function canvasEncode(canvas: CanvasLike, mimeType: string, quality: number): Promise<Blob | null> {
  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    return (canvas as OffscreenCanvas)
      .convertToBlob({ type: mimeType, quality })
      .then((blob) => (blob.type === mimeType ? blob : null))
      .catch(() => null);
  }

  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob((blob) => resolve(blob && blob.type === mimeType ? blob : null), mimeType, quality);
  });
}

type EncodedImage = { blob: Blob; mimeType: string; extension: string };

async function encodeToAvifOrWebp(canvas: CanvasLike, ctx: Context2DLike, width: number, height: number): Promise<EncodedImage | null> {
  const avifEncode = await loadAvifEncoder();

  if (avifEncode) {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const buffer = await avifEncode(imageData, { quality: AVIF_QUALITY, speed: AVIF_SPEED });
      return { blob: new Blob([buffer], { type: "image/avif" }), mimeType: "image/avif", extension: "avif" };
    } catch {
      // Fall through to a canvas-based encoder below.
    }
  }

  const canvasAvif = await canvasEncode(canvas, "image/avif", CANVAS_AVIF_QUALITY);
  if (canvasAvif) {
    return { blob: canvasAvif, mimeType: "image/avif", extension: "avif" };
  }

  const canvasWebp = await canvasEncode(canvas, "image/webp", CANVAS_WEBP_QUALITY);
  if (canvasWebp) {
    return { blob: canvasWebp, mimeType: "image/webp", extension: "webp" };
  }

  return null;
}

/**
 * Optimises `file` for upload: skips SVGs and already-small AVIFs
 * untouched, otherwise decodes (honouring EXIF orientation), downscales to
 * `maxLongEdge`, and re-encodes to AVIF (falling back to WebP, then the
 * original file if no encoder is available). Throws `ImageOptimizationError`
 * if the optimised result is still over the upload limit.
 */
export async function optimizeImage(file: File, options?: { maxLongEdge?: number }): Promise<OptimizeImageResult> {
  const originalSize = file.size;

  if (isSvg(file)) {
    return { file, originalSize, finalSize: originalSize, skipped: true };
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Not a decodable raster image (or the browser can't decode it) — hand
    // it back untouched rather than failing the whole upload over it.
    return { file, originalSize, finalSize: originalSize, skipped: true };
  }

  try {
    const maxLongEdge = options?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
    const { width, height } = targetDimensions(bitmap.width, bitmap.height, maxLongEdge);

    if (isAvif(file) && width === bitmap.width && height === bitmap.height) {
      return { file, originalSize, finalSize: originalSize, skipped: true };
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as Context2DLike | null;

    if (!ctx) {
      return { file, originalSize, finalSize: originalSize, skipped: true };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const encoded = await encodeToAvifOrWebp(canvas, ctx, width, height);

    if (!encoded) {
      return { file, originalSize, finalSize: originalSize, skipped: true };
    }

    const optimizedFile = new File([encoded.blob], replaceExtension(file.name, encoded.extension), {
      type: encoded.mimeType,
      lastModified: file.lastModified
    });

    if (optimizedFile.size > MAX_ASSET_UPLOAD_BYTES) {
      const limitMb = (MAX_ASSET_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
      const resultMb = (optimizedFile.size / (1024 * 1024)).toFixed(1);
      throw new ImageOptimizationError(`${file.name} is still ${resultMb}MB after optimising, over the ${limitMb}MB upload limit.`);
    }

    // A worse result than the original (rare — tiny/already-compressed
    // images can grow slightly under AVIF's block overhead) still uploads
    // fine, so it's not an error, but there's no point keeping it.
    if (optimizedFile.size >= originalSize) {
      return { file, originalSize, finalSize: originalSize, skipped: true };
    }

    return { file: optimizedFile, originalSize, finalSize: optimizedFile.size, skipped: false };
  } finally {
    bitmap.close();
  }
}
