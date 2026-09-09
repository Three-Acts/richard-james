import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Build-time AVIF compression for locally-owned raster images.
 *
 * Walks the built client output (which already contains a copy of `public/`),
 * and for every .png/.jpg/.jpeg/.webp writes a sibling `.avif`. The original is
 * kept as a fallback; the `<Image>` component emits a `<picture>` that prefers
 * the AVIF. Only touches images we ship in the repo — external/CDN media is
 * never referenced here.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDist = path.join(appRoot, "dist");

const RASTER = /\.(png|jpe?g|webp)$/i;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (RASTER.test(entry.name)) {
      yield full;
    }
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

let count = 0;
let originalTotal = 0;
let avifTotal = 0;

for await (const file of walk(clientDist)) {
  const out = file.replace(RASTER, ".avif");
  try {
    const input = await readFile(file);
    const avif = await sharp(input).avif({ quality: 50, effort: 4 }).toBuffer();
    await writeFile(out, avif);
    const originalSize = (await stat(file)).size;
    originalTotal += originalSize;
    avifTotal += avif.length;
    count += 1;
    console.log(`  ${path.relative(clientDist, file)}  ${kb(originalSize)} → ${kb(avif.length)}`);
  } catch (error) {
    console.warn(`  skipped ${path.relative(clientDist, file)}: ${error.message}`);
  }
}

if (count === 0) {
  console.log("No local raster images in public/ to compress.");
} else {
  const saved = originalTotal - avifTotal;
  const pct = originalTotal ? Math.round((saved / originalTotal) * 100) : 0;
  console.log(`Compressed ${count} image(s) to AVIF — ${kb(originalTotal)} → ${kb(avifTotal)} (${pct}% smaller).`);
}
