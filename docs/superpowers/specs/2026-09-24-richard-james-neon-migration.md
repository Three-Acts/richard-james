# Richard James portfolio on Neon: migration spec

Date: 2026-09-24. Status: in progress.

## Goal

Turn the `three-acts` template into the Richard James portfolio, with Neon as the
only external provider (Postgres for content, Neon object storage for images,
Neon Auth for editor login), and `apps/api` as the single gateway to Neon.
The Astro site (`apps/web`) and the CMS (`apps/cms`) only ever call `/api/*`.
Swapping Neon for another provider later means touching `apps/api` only.

```
apps/web  --build-time GET /api/content/*-->  apps/api  --SQL-->        Neon Postgres
apps/cms  --Bearer JWT   /api/cms/*      -->  apps/api  --S3 API-->     Neon object storage (bucket "public")
apps/cms  --POST /api/auth/sign-in       -->  apps/api  --HTTP-->       Neon Auth
```

## Ownership (parallel implementation)

| Area | Owner | Files |
| --- | --- | --- |
| Shared schema + contracts | schema agent | `packages/cms-schema/**` |
| CMS app | cms agent | `apps/cms/**` |
| API app | api agent | `apps/api/**`, root `.env.example` notes |
| Web app | web agent | `apps/web/**` |
| Docs (README, CONTEXT, ADR) | orchestrator, after review | `README.md`, `CONTEXT.md`, `docs/adr/0004-*` |

## 1. Collection registry (`packages/cms-schema/src/registry.ts`)

Replace every template collection with exactly these four (projects, pages, site-settings, contact-submissions). Column naming stays
`snake_case` (default). System columns stay the defaults.

### `projects` (mode `editorial`, table `projects`, group "Work", titleField `title`)

| key | type | required | notes |
| --- | --- | --- | --- |
| title | text | yes | |
| slug | slug | yes | `urlPrefix: "richardjamesart.com/projects/"` |
| year | text | yes | helpText "Four-digit year, e.g. 2025" |
| sortOrder | number | yes | helpText "Position in the browsing order (1 = first). Next/previous links and the home stage follow this order." |
| subtitle | text | no | helpText "Translated or transliterated subtitle" |
| originalTitle | text | no | helpText "Title in its original writing system" |
| originalTitleLang | text | no | helpText "BCP 47 language tag for the original title, e.g. fa or hi" |
| medium | textarea | yes | helpText "Materials and dimensions. One line per element." |
| description | textarea | no | helpText "Slide text shown on the project page" |
| metaDescription | textarea | no | helpText "Short description for search engines and social cards" |
| hero | asset | yes | `bucket: "public"`, `accept: "image/*"` |
| thumb | asset | no | `bucket: "public"`, helpText "Defaults to the hero image when empty" |
| gallery | gallery | no | `bucket: "public"`, `accept: "image/*"`. All images of the work in viewing order, stored on the record as JSON `GalleryItem[]` (`{ src, caption? }`). Revised 2026-09-24: images were briefly a separate `project-images` collection; the user asked for a client-friendly gallery on the project record instead. |
| gridStride | number | no | helpText "Show every Nth gallery image in the grid (all images stay in the viewer). 0 or 1 shows every image." |

listColumns: title (Name, minmax(220px,1.4fr)), year (90px), sortOrder (Order, 90px), publishStatus (status, 160px), modifiedAt (datetime, 170px).

### `pages` (mode `editorial`, table `pages`, group "Site", titleField `title`)

| key | type | required | notes |
| --- | --- | --- | --- |
| title | text | yes | |
| key | slug | yes | helpText "Route key the site looks up: about or essay" |
| body | textarea | yes | helpText "Lightweight markdown: '# ' heading 1, '## ' heading 2, '### ' heading 3, '- ' list item, blank line between paragraphs." |

listColumns: title (Name), key (Key, 140px), publishStatus (status, 160px), modifiedAt (datetime, 170px).

### `site-settings` (mode `data`, table `site_settings`, group "Site", titleField `name`)

description: "One record. The site reads the most recently modified record."

| key | type | required |
| --- | --- | --- |
| name | text | yes |
| tagline | text | yes |
| location | text | no |
| email | text | yes |
| phone | text | no |
| phoneHref | text | no (helpText "tel: link, e.g. tel:+27794273687") |
| description | textarea | yes (helpText "Default meta description") |
| ogImage | asset | no (`bucket: "public"`, `accept: "image/*"`) |

listColumns: name (Name), email (Email), modifiedAt (datetime, 170px).

### `contact-submissions` (mode `readonly`, table `contact_submissions`, group "Inbox", titleField `name`)

| key | type | required |
| --- | --- | --- |
| name | text | yes |
| email | text | yes |
| message | textarea | no |
| submittedAt | datetime | no |

listColumns: name (Name), email (Email), createdAt (Received, datetime, 170px).

## 2. New field types: `gallery` and `reference`

### `gallery`

```ts
export type GalleryField = FieldBase<"gallery"> & { type: "gallery"; bucket: string; accept?: string; maxItems?: number };
export type GalleryItem = { src: string; caption?: string };
```

- Stored as text holding a JSON array of `GalleryItem`; helpers `parseGalleryValue` /
  `serializeGalleryValue` live in the schema package. Column type `text`.
- API validation: parse, keep items with a string `src`, drop empty captions, cap at
  `maxItems` (default 200); invalid JSON is a validation error.
- CMS editor: multi-file drop zone; each file is uploaded through the existing
  asset upload route (one request per file, no per-image records); thumbnail grid
  with move up/down, remove, and an optional caption per item.
- Content API: `ProjectContent.images` is built from this field.

### `reference` (generic, kept available; no collection uses it after the gallery change)

```ts
export type ReferenceField = FieldBase<"reference"> & { type: "reference"; collection: string };
```

- `FieldType` gains `"reference"`; `CmsField` union gains `ReferenceField`;
  `ListColumn.valueType` gains `"reference"`.
- Stored as text (the referenced record's id). `print-schema` maps it to `text`.
- API validation (`service.ts`): treated like text; when `enforceRequired` and
  required, must be non-empty; when non-empty, the referenced record must exist
  in the referenced collection (`not_found`-style validation error otherwise).
- CMS editor: a Select whose options are the referenced collection's records
  (label = referenced collection's titleField value, value = record id),
  loaded through the active backend's `listRecords(refCollection, { limit: 500, sort: { key: <titleField>, direction: "asc" } })`.
- CMS list column with `valueType: "reference"`: show the referenced record's
  title when resolvable, else the raw id.
- Mock adapter: seed data for `projects` must include a valid gallery JSON value.

## 3. Public content contract (`packages/cms-schema/src/content-contract.ts`)

Read-only, unauthenticated routes served by `apps/api`, returning only
`published` records (site-settings has no publish workflow: newest record wins).
Envelope is the standard `{ ok: true, data }`.

```
GET /api/content/site              -> SiteContent
GET /api/content/projects          -> ProjectContent[]   (ordered by sortOrder asc, images embedded from the gallery field in stored order)
GET /api/content/projects/:slug    -> ProjectContent
GET /api/content/pages             -> PageContent[]
GET /api/content/pages/:key        -> PageContent
```

Types are defined in the contract file (see the file itself). `thumb` falls back
to `hero` server-side. `images[].src` are absolute public URLs.  `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

## 4. Auth contract (`packages/cms-schema/src/auth-contract.ts`)

```
POST /api/auth/sign-in   body { email, password }  -> AuthSession { token, expiresAt, user: { id, email, name } }
GET  /api/auth/session   Authorization: Bearer      -> AuthSession (401 when invalid/expired)
POST /api/auth/sign-out  Authorization: Bearer      -> { signedOut: true }
```

Neon Auth is managed Better Auth, reached over plain REST at `NEON_AUTH_BASE_URL`.
Its JWTs expire after 15 minutes, so the CMS never holds a JWT. Instead:

- Sign-in: the API calls `POST {NEON_AUTH_BASE_URL}/sign-in/email`, captures the
  session cookie from `Set-Cookie` (use `headers.getSetCookie()`), then calls
  `GET {NEON_AUTH_BASE_URL}/get-session` with that cookie to read the user and
  the session expiry. The `token` returned to the CMS is the opaque session
  cookie VALUE; `expiresAt` is the session's expiry.
- Verification (`requireAuth` in `apps/api/api/_lib/auth.ts`): a bearer token is
  accepted when (a) `PUBLISH_TOKEN` is set and the token equals it (constant
  time; for scripts/CI), or (b) `GET {NEON_AUTH_BASE_URL}/get-session` with
  `Cookie: <session cookie name>=<token>` returns a session. Positive results
  are cached in module memory for 60 s keyed by token. The cookie name is
  `NEON_AUTH_SESSION_COOKIE` (env) defaulting to the name observed during
  sign-in (expected `__Secure-neonauth.session_token`; confirm against the live
  service and hard-code the confirmed default).
- Unset `PUBLISH_TOKEN` and unset `NEON_AUTH_BASE_URL` in production = 503, as today.
  Outside production with neither configured, requests are allowed (dev only).
- The CMS `AuthClient` calls these routes, stores the session in
  `localStorage` (key `cms.session`), restores it on load via `/api/auth/session`,
  and returns `token` from `getAccessToken()`.
- Sign-up is disabled at the Neon Auth level once the first editor exists
  (`neon neon-auth config email-password update --disable-sign-up`). The first
  editor is created by the operator via `npm run auth:create-editor -w @three-acts/api -- --email ... --password ...`
  (which calls `POST {NEON_AUTH_BASE_URL}/sign-up/email`), not by the CMS.
- JWT verification via `NEON_AUTH_JWKS_URL` is documented as a future option
  (for tokens minted by other Neon services); it is not built now.

## 5. API storage backends (`apps/api/api/_lib/cms/`)

- `apps/api/api/_lib/db.ts`: a lazily created `pg` `Pool` on `DATABASE_URL`
  (pooled), `max: 5`, registered with `attachDatabasePool` from
  `@vercel/functions`. Migrations use `DATABASE_URL_UNPOOLED`.
- `neon-store.ts`: `NeonDataStore implements CmsDataStore` on that pool,
  generic over the registry via `columnForField`/`systemColumnsFor` (ILIKE
  search on text/textarea/slug, sort, limit/offset, optimistic concurrency on
  `updated_at`, `publishQueued`, `setPublishStatus`). Parameterised SQL only;
  identifiers quoted with a helper and validated against the registry (never
  from request input).
- `neon-blob-store.ts`: `NeonBlobStore implements CmsBlobStore` using
  `@aws-sdk/client-s3` with `forcePathStyle: true`, credentials/endpoint/region
  from the standard `AWS_*` env vars. Public URL = `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>`.
- `resolve-store.ts`: Neon is the only backend — no in-memory fallback, and no
  `CMS_DATA_BACKEND`/`CMS_STORAGE_BACKEND` env vars to pick one. `getDataStore()`
  / `getBlobStore()` always return `NeonDataStore`/`NeonBlobStore`; each throws
  a clear `CmsError("unavailable", ...)` naming the missing env var the first
  time a request actually needs it, rather than failing at import time.
- Supabase code and `@supabase/supabase-js` are removed from `apps/api` and `apps/web`.
- `POST /api/contact` inserts into `contact-submissions` through the data store.
- Public content routes (`/api/content/*`) read published records through the
  data store and shape them to the content contract.
- Seed data and images live in `apps/api/seed/` (`seed/data/*.ts`, migrated
  from `apps/web/src/data/*.ts`; `seed/images/**`, migrated from
  `apps/web/public/images/`), not under `apps/web`. `scripts/seed.ts` imports
  `seed/data/*.ts` with normal static `import` statements (no runtime-computed
  `file://` specifier needed now that the loaded files don't depend on
  Vite/Astro-only globals) and walks `seed/images/` on disk.
- Scripts: `npm run db:migrate -w @three-acts/api` (applies the generated
  schema SQL over `DATABASE_URL_UNPOOLED`, idempotent) and
  `npm run db:seed -w @three-acts/api` (uploads `apps/api/seed/images/**` to
  the bucket under `images/...`, inserts site settings, pages and projects
  (gallery embedded) as `published`; idempotent by slug/key/object key;
  `--dry-run` and `--skip-images` supported). `npm run auth:create-editor`
  creates the first editor account.

## 6. Web content layer (`apps/web/src/content/`)

- `ContentSource` = `{ name, getSite(), listProjects(), getProject(slug), getPage(key) }`.
- `api-source.ts`: fetches `${API_ORIGIN}/api/content/*` at build/SSR time. This
  is the only source — `apps/web` has no local content files and no
  `local`/mock fallback, and there is no `CONTENT_SOURCE` env var.
- `API_ORIGIN` is required in every environment (dev, preview, production).
  `getContentSource()` throws immediately if it's unset, and probes
  `getSite()`/`listProjects()` up front so an unreachable API fails the
  build/dev server fast with one clear error instead of scattered fetch
  failures across every page.
- `next`/`previous` are derived from `sortOrder` (wrapping cycle), replacing the
  hand-maintained `next` field. `years` derive from the projects list.
- Islands receive data via props only (`HomeExperience`, `ProjectsGrid`).
- `site.url` stays synchronous, resolved from `VITE_SITE_URL`/Vercel env as the
  template does; `astro.config.mjs` must not import content.
- Build script is `astro build && node scripts/gen-sitemap.mjs` — no
  build-time image-compression step over content images, since they're no
  longer bundled into `apps/web` at all.

## 7. Out of scope (documented, not built)

Presigned uploads for files over 4 MB, per-editor roles, version history,
Cloudflare R2 (would be a second `CmsBlobStore`).
