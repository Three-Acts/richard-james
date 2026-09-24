import { contentApiPaths, type PageContent, type ProjectContent, type SiteContent } from "@three-acts/cms-schema"
import type { ContentSource } from "./types"

/**
 * `apps/api`'s public content routes (`/api/content/*`), read at build/dev
 * time with the global `fetch` (Node 24). Every response uses the standard
 * API envelope `{ ok: true, data } | { ok: false, error: { code, message } }`
 * (see `packages/cms-schema/src/content-contract.ts`).
 */
type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code?: string; message: string } }

async function request<T>(apiOrigin: string, path: string): Promise<T | null> {
  const url = `${apiOrigin.replace(/\/+$/, "")}/api${path}`

  let response: Response
  try {
    response = await fetch(url)
  } catch (cause) {
    throw new Error(`Content API request to ${url} failed: could not reach ${apiOrigin}`, { cause })
  }

  if (response.status === 404) return null

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch (cause) {
    throw new Error(`Content API request to ${url} returned ${response.status} with an unparseable body`, {
      cause
    })
  }

  if (!response.ok || !envelope.ok) {
    const message = !envelope.ok ? envelope.error.message : response.statusText
    throw new Error(`Content API request to ${url} failed (${response.status}): ${message}`)
  }

  return envelope.data
}

/** Like `request`, but a 404 is a bug (site/project-list/page-list always exist) rather than "not found". */
async function requireRequest<T>(apiOrigin: string, path: string): Promise<T> {
  const data = await request<T>(apiOrigin, path)
  if (data === null) {
    throw new Error(`Content API request to ${apiOrigin}/api${path} unexpectedly returned 404`)
  }
  return data
}

export function createApiContentSource(apiOrigin: string): ContentSource {
  // Every page render calls getSite() (Base.astro) and every route's
  // getStaticPaths calls listProjects() — memoise both per source instance
  // (itself created once, see `./index.ts`) so a ~38-page static build issues
  // one request for each instead of one per page.
  let sitePromise: Promise<SiteContent> | null = null
  let projectsPromise: Promise<ProjectContent[]> | null = null

  return {
    name: `api (${apiOrigin})`,
    getSite() {
      // A rejection must not stick around forever (see ./index.ts) — reset
      // the memo so the next call re-fetches instead of replaying the same
      // stale rejection for the rest of the dev session.
      sitePromise ??= requireRequest<SiteContent>(apiOrigin, contentApiPaths.site()).catch((error: unknown) => {
        sitePromise = null
        throw error
      })
      return sitePromise
    },
    listProjects() {
      projectsPromise ??= requireRequest<ProjectContent[]>(apiOrigin, contentApiPaths.projects()).catch(
        (error: unknown) => {
          projectsPromise = null
          throw error
        }
      )
      return projectsPromise
    },
    async getProject(slug) {
      return request<ProjectContent>(apiOrigin, contentApiPaths.project(slug))
    },
    async getPage(slug) {
      return request<PageContent>(apiOrigin, contentApiPaths.page(slug))
    }
  }
}
