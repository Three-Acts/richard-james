import { createApiContentSource } from "./api-source"
import type { ContentSource } from "./types"

export type { ContentSource, PageContent, ProjectContent, ProjectImageContent, SeoContent, SiteContent } from "./types"

/**
 * Resolves the content source. The site has no local content anymore — every
 * page reads published content from `apps/api` at build/dev time, so
 * `API_ORIGIN` is required in every environment. A missing or unreachable API
 * fails the build/dev server immediately with one clear error, rather than as
 * scattered fetch failures across every page's frontmatter/getStaticPaths.
 *
 * `import.meta.env` covers values Vite bakes in from `.env`; `process.env`
 * covers values only present at runtime (e.g. set directly in Vercel), so
 * both are checked.
 */
function readApiOrigin(): string | undefined {
  const fromVite = (import.meta.env as Record<string, string | undefined>).API_ORIGIN
  return fromVite ?? process.env.API_ORIGIN
}

let cached: Promise<ContentSource> | null = null

async function resolveContentSource(): Promise<ContentSource> {
  const apiOrigin = readApiOrigin()

  if (!apiOrigin) {
    throw new Error(
      "API_ORIGIN must be set — apps/web has no local content fallback and reads everything from apps/api. " +
        "Set it in apps/web/.env for dev/local builds, or as a Vercel env var for deploys."
    )
  }

  const source = createApiContentSource(apiOrigin)

  // Probe up front so a misconfigured/unreachable API surfaces as one clear
  // error at build/dev start, in every environment — no fallback. Both calls
  // are memoised on the source (see api-source.ts), so the real pages that
  // call them again don't cost extra requests.
  try {
    await Promise.all([source.getSite(), source.listProjects()])
  } catch (error) {
    throw new Error(
      `Content API at ${apiOrigin} is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error instanceof Error ? error : undefined }
    )
  }

  console.info(`[content] source: ${source.name}`)
  return source
}

export function getContentSource(): Promise<ContentSource> {
  if (!cached) {
    // A rejected probe (e.g. the API not up yet — `npm run dev` at the repo
    // root starts web and api concurrently) must not permanently poison the
    // module for the rest of the dev session: reset `cached` so the NEXT call
    // re-probes from scratch, while this call still rejects with the same
    // clear error.
    cached = resolveContentSource().catch((error: unknown) => {
      cached = null
      throw error
    })
  }
  return cached
}
