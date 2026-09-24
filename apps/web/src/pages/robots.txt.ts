import type { APIRoute } from 'astro'

/**
 * /robots.txt — replaces the static public/robots.txt (which baked in a
 * hardcoded domain) so the sitemap line follows the resolved site origin
 * (astro.config.mjs `site`, exposed as import.meta.env.SITE) instead.
 */
export const GET: APIRoute = () => {
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${import.meta.env.SITE}/sitemap.xml`, ''].join(
    '\n',
  )

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
