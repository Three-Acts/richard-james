/**
 * Generates public/og-default.jpg — the default Open Graph / Twitter card image
 * referenced by src/components/Seo.astro (`${site.url}/og-default.jpg`).
 *
 * Pipeline:
 *   1. Take a strong gold-leaf hero AVIF from the API's seed images (the site
 *      itself has no local artwork — apps/api/seed/images is the one copy).
 *   2. Cover-fit + crop to the canonical 1200×630 OG canvas.
 *   3. Composite a near-black bottom-up gradient + ground tint for legibility.
 *   4. Overlay restrained bone serif text (name + tagline) echoing the site's
 *      Cinzel / Quattrocento art direction.
 *   5. Export JPEG at quality ~82 (mozjpeg) for a crisp, light-weight card.
 *
 * Run:  node scripts/gen-og.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, relative, resolve } from 'node:path'
import { access, stat } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SEED_IMAGES = resolve(ROOT, '../api/seed/images')

const WIDTH = 1200
const HEIGHT = 630

// Candidate hero sources, in preference order. The first that exists wins,
// so the script stays resilient if a single project is ever renamed.
const SOURCE_CANDIDATES = [
  resolve(SEED_IMAGES, 'projects/ghosts-become-ancestors/ghosts-become-ancestors-01.avif'),
  resolve(SEED_IMAGES, 'projects/remember/remember-01.avif'),
  resolve(SEED_IMAGES, 'projects/straight-forward/straight-forward-01.avif'),
]

const OUTPUT = resolve(ROOT, 'public/og-default.jpg')

// Brand strings (kept literal so the script has no app-import / TS dependency).
const NAME = 'RICHARD JAMES'
const TAGLINE = 'South African / UK Artist'

async function firstExisting(candidates) {
  for (const rel of candidates) {
    const full = resolve(ROOT, rel)
    try {
      await access(full)
      return full
    } catch {
      /* try next */
    }
  }
  throw new Error(`No OG source image found. Tried:\n  ${candidates.join('\n  ')}`)
}

/** XML-escape text destined for the SVG overlay. */
function esc(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  )
}

/**
 * Legibility + branding overlay as a single SVG buffer:
 *  - a vertical near-black gradient anchored to the bottom,
 *  - a faint global ground tint,
 *  - a hairline antique-gold rule,
 *  - name (bone serif caps) + tagline (muted serif).
 * Generic system serifs are used so no font files are required at build time;
 * the weight/tracking still reads as the gallery-grade treatment.
 */
function overlaySvg() {
  const GOLD = '#b89668'
  const BONE = '#ece7dd'
  const BONE_DIM = '#c8c2b6'

  return Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#0b0b0c" stop-opacity="0.10"/>
      <stop offset="48%" stop-color="#0b0b0c" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#0b0b0c" stop-opacity="0.92"/>
    </linearGradient>
  </defs>

  <!-- Bottom-anchored darkening for text legibility -->
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
  <!-- Subtle, even ground tint to unify the frame -->
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#0b0b0c" fill-opacity="0.16"/>

  <!-- Hairline gold rule above the wordmark -->
  <rect x="80" y="468" width="64" height="2" fill="${GOLD}"/>

  <!-- Wordmark -->
  <text x="80" y="540"
        font-family="'Cinzel','Times New Roman',Georgia,serif"
        font-size="62" font-weight="600" letter-spacing="6"
        fill="${BONE}">${esc(NAME)}</text>

  <!-- Tagline -->
  <text x="82" y="582"
        font-family="'Quattrocento',Georgia,'Times New Roman',serif"
        font-size="26" letter-spacing="3"
        fill="${BONE_DIM}">${esc(TAGLINE)}</text>

  <!-- Gold accent dot anchoring the lower-right corner -->
  <circle cx="${WIDTH - 80}" cy="${HEIGHT - 78}" r="5" fill="${GOLD}"/>
</svg>`)
}

async function main() {
  const source = await firstExisting(SOURCE_CANDIDATES)

  const base = await sharp(source)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    // Quiet the source a touch so the wordmark holds; keeps the gold warm.
    .modulate({ brightness: 0.92, saturation: 0.96 })
    .toBuffer()

  await sharp(base)
    .composite([{ input: overlaySvg(), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(OUTPUT)

  const { size } = await stat(OUTPUT)

  console.log(
    `✓ og-default.jpg — ${WIDTH}×${HEIGHT}, ${(size / 1024).toFixed(0)} KB  (source: ${relative(ROOT, source)})`
  )
}

main().catch((err) => {
  console.error('✗ gen-og failed:', err.message)
  process.exit(1)
})
