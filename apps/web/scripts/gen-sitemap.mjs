// Generates dist/sitemap.xml by walking the statically pre-rendered output.
// astro.config.mjs sets build.format:'file', so Astro emits FLAT files
// (dist/projects/loss.html, dist/about.html) — we map every *.html → its clean
// URL. Switching that back to the default 'directory' format would need the
// /index stripping below to become the main path, not a fallback.
import { readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { resolveSiteUrl } from './site-origin.mjs'

const DIST = 'dist'

// Same resolver astro.config.mjs uses for `site` — see scripts/site-origin.mjs
// for why this script (a plain node process running after `astro build` has
// already exited) re-derives it instead of trusting `process.env` alone.
const ORIGIN = resolveSiteUrl()

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

function toUrl(file) {
  // dist/index.html -> "/", dist/projects/loss.html -> "/projects/loss"
  const rel = relative(DIST, file).replace(/\.html$/, '')
  if (rel === 'index') return '/'
  return '/' + rel.replace(/\/index$/, '')
}

const files = await walk(DIST)
const urls = [...new Set(files.map(toUrl))]
  .filter((u) => !/(^|\/)(404|200)$/.test(u))
  .sort((a, b) => a.localeCompare(b))

const today = new Date().toISOString().slice(0, 10)
const body = urls
  .map((u) => {
    const priority = u === '/' ? '1.0' : u.startsWith('/projects/') ? '0.8' : '0.6'
    const changefreq = u === '/' ? 'weekly' : 'monthly'
    return `  <url>\n    <loc>${ORIGIN}${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  })
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

await writeFile(join(DIST, 'sitemap.xml'), xml)
console.log(`✓ sitemap.xml — ${urls.length} urls`)
