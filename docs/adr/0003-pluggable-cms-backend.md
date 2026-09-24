# ADR 0003: Pluggable CMS backend

- Status: Accepted
- Date: 2026-09-24

## Context

The CMS shipped with a single hardwired mock adapter (`apps/cms/src/cms/mock-adapter.ts`), so there was no path to a real backend without rewriting CMS code. The domain language in `CONTEXT.md` was Supabase-specific ("backed by exactly one Supabase table", "Supabase client"), even though the intent was always a swappable backend. On top of that:

- Publishing called `/api/deploy` with no auth, so anyone who found the URL could trigger a production deploy.
- Records did not own their `id` or timestamps; the client could set them, which made server-side validation and audit unreliable.
- Saves had no concurrency check, so two editors saving the same record could silently overwrite each other.
- "Publish" only triggered a site rebuild. It never moved records from queued to published, so queued content and the live site could disagree.

## Decision

Split the CMS backend into a shared schema package, a client-side backend contract, and a server-side REST bridge:

- `@three-acts/cms-schema` (`packages/cms-schema`) holds the collection registry, field types, `CmsError`, the REST wire contract (`cmsApiPaths`), and column-mapping helpers (`columnForField`, `systemColumnsFor`). Both `apps/cms` and `apps/api` depend on it, so the API validates writes against the same registry the editor renders.
- The CMS backend contract is three interfaces: `CmsDataAdapter` (records: `listRecords` with search/sort/limit/offset returning `{ records, total }`, server-owned ids and timestamps via `createRecord`, optimistic concurrency via `saveRecord(..., { expectedModifiedAt })` throwing a `conflict` `CmsError`, and `publishQueued()`), `CmsStorageAdapter` (asset upload), and `AuthClient` (session plus `getAccessToken`). `CmsBackend = { name, data, storage }` is injected through `CmsBackendProvider`; `VITE_CMS_BACKEND=mock|rest` picks the implementation.
- Publishing is two steps. `publishQueued()` is the Publish Transition: it flips every record queued to publish over to published in the data store. `POST /api/deploy` is the Site Deploy: it rebuilds the static site. The CMS runs both in order and polls `/api/deploy-status`.
- Every `/api/deploy`, `/api/deploy-status`, and `/api/cms/*` route requires `Authorization: Bearer <PUBLISH_TOKEN>`, compared in constant time (`apps/api/api/_lib/auth.ts`). An unset token is dev-only and responds 503 in production.
- `apps/api` hosts the REST bridge (`/api/cms/*`) on top of two provider-agnostic server interfaces, `CmsDataStore` and `CmsBlobStore`, in `apps/api/api/_lib/cms/`. Implementations: Supabase (service-role, data and Storage) and an in-process Memory store for local dev, selected by `CMS_DATA_BACKEND` and `CMS_STORAGE_BACKEND` (defaulting to Supabase when its env vars are present). `npm run schema:sql -w @three-acts/api` prints `CREATE TABLE` SQL for every registry collection, so any Postgres-compatible database can be provisioned from the same schema.
- Asset upload over the bridge is base64 JSON capped at 4 MB, the Vercel body limit. A presigned-URL flow for large files is documented as future work, not built here.

## Alternatives considered

- **Browser talks to Supabase directly, guarded by Row Level Security.** Rejected. It ties the CMS bundle to one vendor's client SDK, moves authorization logic into RLS policies that are hard to test alongside the editor, and gives every future backend (Postgres, Cloudflare) a different shape of client-side integration instead of one server-side interface.
- **Per-provider adapters built into the CMS bundle**, for example a Supabase-specific `CmsDataAdapter` shipped in `apps/cms`. Rejected. It would ship every provider's SDK to the browser regardless of which one is active, and it puts credentials and privileged operations, such as service-role writes, in client code. Keeping providers server-side behind `CmsDataStore` and `CmsBlobStore` means the browser only ever talks to `apps/api` over the REST bridge.

## Consequences

- Every CMS read or write in `rest` mode makes an extra hop through `apps/api` instead of calling a backend directly from the browser. That hop is the cost of keeping providers swappable and credentials server-side.
- `PUBLISH_TOKEN` is a stopgap. It is one shared secret, not per-editor identity. It should be replaced once a real auth provider (Clerk, Auth0, Supabase Auth) issues session JWTs the API can verify; `AuthClient.getAccessToken()` already gives the CMS a seam for that swap.
- The Memory data store and blob store are dev-only. State resets on process restart, so they are for local development, not staging or production.
- Asset uploads are capped at 4 MB by the base64 JSON body; larger files need the presigned-URL flow noted above.
- ADR 0002's "Kept as-is" list (Tailwind v4 theme pipeline, `@three-acts/utils` conventions, the AVIF post-build script, the same-origin `/api/*` convention) is still valid. None of it changes with this ADR.
</content>
