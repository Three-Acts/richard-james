import type { APIRoute } from 'astro'
import { getContentSource } from '@/content'
import { parsePageBody } from '@/content/body'
import { site as staticSite } from '@/data/site'

/**
 * /llms.txt — the llmstxt.org convention for AI crawlers and assistants: a
 * plain-markdown index of who the artist is and where everything lives.
 * Generated from the same content source as the pages themselves, so it can
 * never drift from the published site content.
 */
export const GET: APIRoute = async () => {
  const source = await getContentSource()
  const [siteContent, projects, aboutPage, essayPage] = await Promise.all([
    source.getSite(),
    source.listProjects(),
    source.getPage('about'),
    source.getPage('essay'),
  ])
  const site = { ...siteContent, url: staticSite.url }

  const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

  const works = projects.map((p) => {
    const detail = p.metaDescription?.trim() || [p.year, p.medium.split('\n')[0]].filter(Boolean).join(', ')
    return `- [${p.title} (${p.year})](${site.url}/projects/${p.slug})${detail ? `: ${oneLine(detail)}` : ''}`
  })

  const aboutBlocks = aboutPage ? parsePageBody(aboutPage.body) : []
  const essayTitle = essayPage?.title ?? 'Essay'

  const text = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${site.name} studied sculpture at Central Saint Martins in London, spent seven years as a Zen monk, seven years teaching children and later trained as a counsellor. The work explores Buddhist practice (the kesa, the Unborn), affect theory (Laplanche, Massumi) and their meeting point with psychotherapy.`,
    '',
    '## Pages',
    '',
    `- [Home — all works](${site.url}/): The full portfolio of ${projects.length} works.`,
    `- [Essay — ${essayTitle}](${site.url}/essay): Long-form essay on the kesa, affect theory and the Unborn.`,
    `- [About the artist](${site.url}/about): Biography and artistic statement.`,
    `- [Contact](${site.url}/contact): Email ${site.email} · ${site.location}.`,
    '',
    '## Works',
    '',
    ...works,
    '',
    '## About',
    '',
    ...aboutBlocks.map((b) => oneLine(b.text)),
    '',
  ].join('\n')

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
