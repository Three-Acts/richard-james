# Richard James

The portfolio site for the artist Richard James: an Astro monorepo with a static public
site, a private CMS, and a Vercel API app that is the **only** thing that talks to Neon.
Neon supplies Postgres (content), object storage (images), and Auth (editor login).
Swapping Neon for another provider later means touching `apps/api` only.

```
apps/web  --build-time GET /api/content/*-->  apps/api  --pg-->          Neon Postgres
apps/cms  --Bearer session token /api/cms/*--> apps/api  --S3 API-->     Neon object storage (bucket "public")
apps/cms  --POST /api/auth/sign-in       -->  apps/api  --REST-->        Neon Auth
```

## Apps

- `apps/web` (`@three-acts/web`) - the public **Astro** site. Prerenders to static HTML
  with a React island for the home stage experience, a build-time content layer that
  reads `apps/api`'s `/api/content/*` (there is no local content and no offline
  fallback — `API_ORIGIN` is required), route-level SEO/AEO metadata, and a same-origin
  `/api/*` convention.
- `apps/cms` (`@three-acts/cms`) - the private, `noindex,nofollow` editorial workspace.
  Reads and writes content through the REST bridge in `apps/api`, and signs editors in
  through the same API's `/api/auth/*` bridge to Neon Auth.
- `apps/api` (`@three-acts/api`) - a Vercel serverless app: the single gateway to Neon
  Postgres, Neon object storage, and Neon Auth. Also hosts the public content API and
  the Vercel deploy-hook bridge for Publish.
- `packages/cms-schema` (`@three-acts/cms-schema`) - the shared collection registry,
  field types, typed errors, the CMS REST wire contract, the public content contract,
  the auth contract, and column-mapping helpers. Consumed by `apps/cms` and `apps/api`
  so both validate against the same schema. See [ADR 0003](docs/adr/0003-pluggable-cms-backend.md)
  and [ADR 0004](docs/adr/0004-neon-single-provider.md).
- `packages/utils` (`@three-acts/utils`) - shared utility helpers (`cn`, `clsx`, `cv`).
- `packages/config` (`@three-acts/config`) - shared theme tokens consumed by Tailwind.

The workspace root package is named `three-acts` for historical reasons (see `git log`);
the product itself is Richard James's portfolio, not a template.

## Scripts

```sh
npm install
npm run dev          # web + cms + api together
npm run dev:web
npm run dev:cms
npm run dev:api
npm run build
npm run lint
npm run typecheck
```

`apps/api`'s dev server (`scripts/dev-server.ts`) runs under `tsx watch`, so editing any
`api/**`/`scripts/**` file restarts it automatically - no manual restart needed while
iterating on API routes.

See **Local dev setup** below for the env files `npm run dev` needs.

## Local dev setup

There is no mock/offline mode anywhere in this stack — the CMS always talks to the real
REST + auth bridges, and `apps/web` always reads live content from `apps/api`. Local dev
needs a repo-root `.env.local` (generated, not hand-written) plus three small per-app
`.env` files (hand-written once, gitignored):

1. Link the repo to the Neon project (see **Neon setup** below) so `neon link` writes a
   repo-root `.env.local` with the live `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
   `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, and `AWS_*` values. `apps/api`'s dev
   server, and its `db:migrate`/`db:seed`/`auth:create-editor` scripts, load this file
   automatically — never create or edit it by hand.
2. Create `apps/api/.env`:

   ```sh
   NEON_AUTH_ORIGIN=http://localhost:5175
   API_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
   ```

3. Create `apps/cms/.env`:

   ```sh
   API_ORIGIN=http://localhost:5175
   ```

4. Create `apps/web/.env`:

   ```sh
   VITE_SITE_URL=http://localhost:5199
   API_ORIGIN=http://localhost:5175
   ```

5. `npm run dev` (or `dev:web`/`dev:cms`/`dev:api` individually).

All three `.env` files (and the root `.env.local`) are covered by `.gitignore`'s `.env`
and `*.local` rules — never commit any of them. Each app also ships an `*.env.example`
with the same keys and comments for reference.

## Neon setup

Everything Neon-related — Postgres, object storage, and Auth — lives on one Neon
project and is provisioned by the Neon CLI, not by hand:

```sh
npm install -g neonctl                 # or: brew install neonctl
neon login
neon link --project-id winter-tooth-70046024 --branch production -y
neon deploy                            # applies neon.ts (auth + the "public" bucket)
npm run db:migrate -w @three-acts/api  # creates tables from the collection registry
npm run db:seed -w @three-acts/api -- --dry-run   # preview: no writes, no uploads
npm run db:seed -w @three-acts/api                # uploads images + inserts content
npm run db:seed -w @three-acts/api -- --skip-images  # re-run without touching the bucket
npm run auth:create-editor -w @three-acts/api -- --email you@example.com --password '...'
neon neon-auth config email-password update --disable-sign-up
neon neon-auth domain add https://your-cms.vercel.app
```

Notes:

- `neon link` and `neon deploy` both write the linked branch's live env vars
  (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`,
  `AWS_*`) to a repo-root `.env.local`. That file is gitignored (`*.local`) — never
  commit it.
- `db:migrate` runs the generated schema SQL over `DATABASE_URL_UNPOOLED` (a direct
  connection; DDL doesn't work over the pooled/PgBouncer `DATABASE_URL`). It's
  idempotent, so re-running it is safe.
- `db:seed` uploads the portfolio's images from `apps/api/seed/images` to the `public`
  bucket and inserts site settings, pages, and projects (each project's `gallery` field
  embedded) as published, from `apps/api/seed/data/*.ts` — the one checked-in copy of
  the portfolio's content (`apps/web` has none of its own). It's idempotent by
  slug/key/object key, so re-running it after a partial failure is safe; `--dry-run`
  computes everything without writing or uploading, and `--skip-images` skips
  re-uploading images that are already in the bucket.
- `auth:create-editor` calls Neon Auth's sign-up endpoint directly — this is the only
  way an editor account gets created; the CMS itself has no sign-up screen. Run
  `neon neon-auth config email-password update --disable-sign-up` right after the first
  editor exists, since anyone who finds the CMS's Neon Auth base URL can otherwise sign
  themselves up.
- `neon neon-auth domain add <origin>` registers a production origin (e.g. the deployed
  CMS's URL) with Neon Auth. Without it, sign-in/sign-up/sign-out from that origin are
  rejected with `MISSING_ORIGIN`. Localhost origins are pre-approved for local dev.
- To get the same values for Vercel's dashboard, run `neon-env export --format dotenv`
  (from `@neon/env`, a root devDependency) and copy the relevant keys into each Vercel
  project's env vars (or `vercel env add`).

## API app

`apps/api` deploys as its own Vercel project from the `apps/api` root. It hosts:

- `GET /api/health`, `GET /api/meta` - health/metadata.
- `GET /api/content/site`, `GET /api/content/projects`, `GET /api/content/projects/:slug`,
  `GET /api/content/pages`, `GET /api/content/pages/:slug` - the public, unauthenticated
  content contract that `apps/web` reads at build time (published records only,
  `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`).
- `POST /api/auth/sign-in`, `GET /api/auth/session`, `POST /api/auth/sign-out` - the
  editor auth bridge to Neon Auth (see **CMS backend** below).
- `/api/cms/*` - the REST bridge the CMS talks to for everything (list/create/save/
  delete/import records, bulk publish-status updates, asset upload).
- `POST /api/deploy` - triggers a Vercel deploy hook (the CMS's Publish flow).
- `GET /api/deploy-status` - normalized Vercel deployment state for progress feedback.

There is no contact form and no `/api/contact` route or `contact-submissions`
collection - both were removed; the site's Contact page (see **Web rendering model**)
is a plain mailto/tel index with nothing to submit.

`apps/web` and `apps/cms` call `/api/*` by default. In local development, their dev
servers proxy `/api/*` to `API_ORIGIN`. On Vercel, each app's `vercel.ts` rewrites
`/api/(.*)` to `${API_ORIGIN}/api/$1`. This keeps browser requests same-origin and
avoids per-app CORS configuration for normal traffic. `API_ALLOWED_ORIGINS` is an
optional comma-separated list of extra browser origins allowed to call the API
directly; it already defaults to the local Vite/Astro dev ports.

## CMS backend

There is exactly one CMS backend now: the CMS always talks to the REST bridge in
`apps/api` (`@three-acts/cms-schema`'s `CmsBackend`, injected via `CmsBackendProvider`)
and always signs editors in through `apps/api`'s `/api/auth/*` bridge to Neon Auth
(`AuthClient`). There is no mock mode, no `VITE_CMS_BACKEND`, no `VITE_CMS_AUTH`, and no
`VITE_PUBLISH_TOKEN` — `apps/cms/.env.example` is just `API_ORIGIN` (plus an optional
`VITE_API_URL` to point at the API dev server directly instead of the dev proxy). Both
interfaces stay named/shaped as `CmsBackend`/`AuthClient` in code so a future backend or
identity provider is still a matter of implementing the interface, not a rewrite — the
mock implementations were simply deleted, not replaced by a flag.

### Data Store and Blob Store

Behind the REST bridge, `apps/api/api/_lib/cms/` implements two provider-agnostic
interfaces, `CmsDataStore` and `CmsBlobStore`. Neon is the only backend — there is no
`CMS_DATA_BACKEND`/`CMS_STORAGE_BACKEND` env var and no in-memory fallback:

- `NeonDataStore` runs parameterised SQL over a `pg` `Pool` on `DATABASE_URL`.
- `NeonBlobStore` uploads to Neon's S3-compatible object storage
  (`@aws-sdk/client-s3`, `forcePathStyle: true`). Public URLs are
  `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>`.

`resolve-store.ts`'s `getDataStore()`/`getBlobStore()` always return these two; each
throws a clear "unavailable" error naming the specific missing env var (`DATABASE_URL`,
or `AWS_ENDPOINT_URL_S3`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) the first time a
request actually needs it, rather than at import time.

Run `npm run schema:sql -w @three-acts/api` to print the `CREATE TABLE` SQL generated
from the collection registry, so any Postgres-compatible database can be provisioned
from the same schema the CMS renders.

### Image uploads

Two things happen before an Asset/Gallery upload ever reaches the Blob Store:

- **Client-side optimisation** (`apps/cms/src/lib/optimize-image.ts`). Every picked/
  dropped raster image is decoded in the browser, downscaled so its long edge is at
  most 1920px, and re-encoded to AVIF with `@jsquash/avif` (a WASM encoder, lazy-loaded
  so it's not in the CMS's main bundle). If that encoder is unavailable it falls back to
  a canvas-based AVIF encode, then canvas WebP, then the original file untouched. SVGs
  are never touched. The optimised file must still fit the 4MB upload limit -
  optimisation runs first, so what actually gets uploaded (and counted against the
  limit) is the smaller file, not the original.
- **Upload on Save, not on drop.** A newly picked file is staged immediately as a local
  `blob:` object URL in the editor's draft - so the preview appears instantly - without
  touching the network. Uploads (concurrency 3, same as the optimisation step) only run
  when the editor clicks Save, right before the record itself is written; each `blob:`
  URL is then replaced with the real bucket URL the upload returned. Clicking Discard
  instead just revokes the local `blob:` URLs and reloads the record - nothing was ever
  uploaded, so there's nothing orphaned in the bucket to clean up.

### Auth: Neon Auth, not a JWT

Neon Auth is managed Better Auth, reached by `apps/api` over plain REST at
`NEON_AUTH_BASE_URL`. The CMS never talks to it directly. Its JWTs expire after 15
minutes, so the token handed to the CMS is the opaque **session token** (the value of
the `__Secure-neon-auth.session_token` cookie Neon Auth sets on sign-in), which lasts 7
days:

- Sign-in (`POST /api/auth/sign-in`): the API calls Neon Auth's `sign-in/email`,
  captures the session cookie, then calls `get-session` to read the user and expiry.
- Verification (`requireAuth`, guarding every `/api/cms/*` route plus `/api/deploy` and
  `/api/deploy-status`): a bearer token is accepted when it equals `PUBLISH_TOKEN`
  (constant-time, for scripts/CI), or when replaying it as a cookie against
  `get-session` returns a live session. Positive results are cached in memory for 5
  minutes per token to avoid a round trip to Neon Auth on every request.
- `sign-in/email`, `sign-up/email`, and `sign-out` all require an `Origin` header
  (`NEON_AUTH_ORIGIN`) or Neon Auth rejects them with `MISSING_ORIGIN`. Localhost is
  pre-approved; a production origin needs `neon neon-auth domain add`.
- Sign-up is never exposed through the CMS. The first (and any additional) editor is
  created with `npm run auth:create-editor -w @three-acts/api`, and sign-up should be
  disabled at the Neon Auth level immediately afterwards.
- Auth is required in every environment: when neither `PUBLISH_TOKEN` nor
  `NEON_AUTH_BASE_URL` is set, every one of these endpoints responds `503` — there is no
  dev-mode bypass, so a local `apps/api/.env` needs at least `NEON_AUTH_ORIGIN` set and
  the repo linked to Neon (see **Local dev setup**) before the CMS can do anything.

### Publishing is two steps

Clicking Publish in the CMS runs:

1. **Publish transition** - the data store flips every record queued to publish over to
   published.
2. **Site deploy** - `POST /api/deploy` rebuilds the static site via a Vercel deploy
   hook.

The CMS then polls `GET /api/deploy-status` until the rebuild finishes, surfacing
progress as **queued → building → deployed** (or failed).

### Adding a backend

A new backend means implementing `CmsDataStore` and/or `CmsBlobStore` in
`apps/api/api/_lib/cms/` and registering it in `resolve-store.ts`. Nothing in `apps/cms`
changes, since it only ever talks to the REST bridge.

See [ADR 0003](docs/adr/0003-pluggable-cms-backend.md) for the backend-splitting
decision and [ADR 0004](docs/adr/0004-neon-single-provider.md) for why Neon is the
provider behind every one of those interfaces today.

### Env matrix

| Variable | App | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | api | Pooled (PgBouncer) Neon Postgres connection for request traffic. |
| `DATABASE_URL_UNPOOLED` | api | Direct Neon Postgres connection, used only by `db:migrate`. |
| `NEON_AUTH_BASE_URL` | api | Base URL of the linked branch's Neon Auth (Better Auth REST API). |
| `NEON_AUTH_SESSION_COOKIE` | api | Name of the session cookie Neon Auth sets; defaults to `__Secure-neon-auth.session_token`. |
| `NEON_AUTH_ORIGIN` | api | Origin header sent to Neon Auth on sign-in/sign-up/sign-out; must be registered with `neon neon-auth domain add` in production. |
| `NEON_AUTH_JWKS_URL` | api | Reserved for future direct-JWT verification; not used by `requireAuth` today. |
| `AWS_ENDPOINT_URL_S3` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | api | Standard AWS SDK vars pointed at Neon's S3-compatible object storage. Neon is the only Data Store/Blob Store backend — there's no backend-selection var. |
| `PUBLISH_TOKEN` | api | Optional shared secret accepted by `/api/cms/*`, `/api/deploy`, `/api/deploy-status` (scripts/CI). Auth is required in every environment: unset alongside an unset `NEON_AUTH_BASE_URL` always 503s, with no dev-mode bypass. |
| `VERCEL_DEPLOY_HOOK_URL` / `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` / `VERCEL_API_BASE` | api | Deploy hook and polling credentials used by the site deploy step. |
| `API_ALLOWED_ORIGINS` | api | Optional extra browser origins allowed to call the API directly (cross-origin). |
| `API_ORIGIN` | web, cms | Where `/api/*` gets rewritten/proxied to. Required for both — `apps/web` has no local content to fall back to. |
| `VITE_SITE_URL` | web | Canonical site origin, used for URLs, sitemap, and social tags. |
| `VITE_API_URL` | cms | Optional direct API URL, bypassing the dev proxy. |

## Web rendering model

`apps/web` is an [Astro 7](https://astro.build) app (`output: "static"`, React 19 via
`@astrojs/react`). Pages live in `src/pages/*.astro`.

- **Home (`/`)** is the signature scroll-synced experience: a single eager React island,
  `HomeExperience` (`client:load`), renders the cinematic stage (GSAP-driven, Lenis for
  smooth scroll) around a visually-hidden, fully crawlable list of every project so
  search engines and no-JS visitors still get the whole portfolio.
- **Project pages** are static Astro markup (a gallery grid) with no React shipped by
  default; clicking an image dynamically imports a small React-rendered fullscreen
  lightbox module on demand, so a project page that's only read ships zero JavaScript
  from that viewer.
- **About, essay, contact, 404** are static pages. Contact is a plain mailto/tel index
  — there is no contact form, and no `/api/contact` route to submit one to (see
  **API app**).
- `astro:transitions`' `ClientRouter` keeps navigation feeling like a single-page app
  without turning the site into one.

In development, `npm run dev:web` (`astro dev`, port 5199) renders every request with
live data fetched from `apps/api` (`API_ORIGIN` is required — see **Local dev setup**).
`npm run build:web` runs `astro build`, then `scripts/gen-sitemap.mjs`.

### Content model

Content is authored in the CMS across three collections (`packages/cms-schema/src/registry.ts`):

- **Projects** (editorial) - one record per artwork/body of work: title, slug, year,
  sort order (drives the browsing order and the home stage), subtitle/original-title
  fields, medium, a rich-text description, a hero asset, an optional thumb (falls back
  to hero), a **gallery** field, and an optional grid stride, plus a Meta title/Meta
  description/Social image SEO group. The gallery field holds the project's whole image
  set as one ordered value (JSON `{ src, caption? }[]`) on the project row itself -
  there is no separate per-image collection or table. The CMS editor renders it as a
  persistent drop zone (always visible, at the top, even once images exist) above a
  list of rows, one per image: a thumbnail, file name and size, a drag handle for
  reordering (with an ArrowUp/ArrowDown keyboard fallback), a wide optional-caption
  input, and a delete button. Each dropped file uploads through the same asset-upload
  route into the bucket; there is no per-image database row. The public content API
  builds `ProjectContent.images` straight from this field.
- **Pages** (editorial, fixed) - the site's standalone pages (About, the artist's
  essay): title, slug, an optional image (About's portrait), a rich-text body, and the
  same SEO group. `allowCreate`/`allowDelete` are both `false` - editors edit copy and
  imagery but can't add or remove pages, since each one is wired to a specific route on
  the site. The slug field renders as a link to the page's live URL, same as on
  Projects.
- **Site Settings** (`data` mode, `singleton: true`) - exactly one record: name,
  tagline, location, email, phone, description, and an optional social image. There is
  no separate phone-link field - the content API derives the `tel:` link from the phone
  number (`derivePhoneHref` in `apps/api/api/_lib/content.ts`), so editors only ever
  maintain the one phone value. No list view - opening the collection opens its one
  record directly as a form, with no New/Delete controls. The site always reads the
  most recently modified record.

Two collections that existed earlier in this migration are gone: **Project Images**
(folded into the `gallery` field - see [ADR 0004](docs/adr/0004-neon-single-provider.md))
and **Contact Submissions** (the contact form was removed; see **API app**). The schema
still defines a generic **reference** field type, but no collection uses one today.

### Rich text

`projects.description` and `pages.body` are `richtext` fields: GitHub-flavoured
markdown plus `<u>` for underline, stored as plain text. The CMS edits them with a
TipTap-based WYSIWYG toolbar (bold/italic/underline/strikethrough, headings, lists,
links, blockquotes), lazy-loaded (`apps/cms/src/components/atoms/rich-text-field.tsx`
dynamically imports the TipTap editor, so the ~main CMS bundle doesn't pay for it until
a rich-text field is actually on screen) and round-tripped through `tiptap-markdown` so
what's saved is the same markdown the content API serves. `apps/web` renders it with
`marked` (GFM parsing) piped through `sanitize-html` (an explicit tag/attribute
allowlist) at build time (`apps/web/src/content/markdown.ts`) - never raw HTML from the
editor.

### Editor sections and SEO fields

Every field declares a `section`: **Basic info** (title/slug), **SEO settings**
(Meta title, Meta description, Social image), or **Custom fields** (everything else,
default when omitted) - the Record Editor Pane groups a record's fields under these
three headings. The SEO fields are optional on both Projects and Pages; the live site
falls back when they're empty: meta title falls back to the record's own title; meta
description falls back to the record's own description/body (stripped of markdown) and
then the site's default description; the social image falls back to the record's hero
(Projects) or the site's own social image, and finally to a bundled `/og-default.jpg`.

To add a project as an editor: create a **Projects** record, upload its hero image, drag
its images into the **Gallery** drop zone, reorder them and add captions where useful,
set the project's own sort order to place it in the browsing sequence, queue it to
publish, then click **Publish** in the CMS top bar. SEO fields are optional - leave them
blank to use the fallbacks above.

Content is read through `apps/web/src/content/`, a `ContentSource` interface with a
single implementation, `api-source.ts`, which fetches `${API_ORIGIN}/api/content/*` at
build/dev time. There is no local content and no fallback: `API_ORIGIN` is required in
every environment, and `getContentSource()` probes the API up front so a missing or
unreachable API fails the build/dev server immediately with one clear error, instead of
surfacing as scattered fetch failures across individual pages.
`next`/`previous` project links and `years` are derived from the project list's
`sortOrder`, not hand-maintained fields.

### Images

There are no owned raster images in `apps/web` at all — every image comes from the CMS's
Neon object storage bucket (`public`), read back as an absolute URL over the Content API
and rendered with a plain `<img>` (no build-time AVIF step). The portfolio's seed images
live in `apps/api/seed/images/` and are uploaded to the bucket under `images/...` by
`db:seed`; editor-uploaded assets land under `uploads/`.

## Performance

A handful of deliberate optimizations keep the CMS responsive against a real database
instead of an in-memory mock:

- **Grouped status counts.** `GET /api/cms/collections` counts each collection with one
  `GROUP BY publish_status` query (`countByStatus`) instead of three separate `COUNT`
  queries, and runs every collection's count in parallel (`Promise.all`).
- **Parallel list + count.** `listRecords` runs its `SELECT` and its `COUNT` as two
  concurrent queries (`Promise.all`) rather than two round trips in series.
- **Slim list payloads.** `GET .../records?fields=list` trims each record's `values` to
  just what the record list needs (the title field, every `listColumns` key, every
  slug/reference field) - large `richtext`/`gallery`/`textarea` values never cross the
  wire for a list view that doesn't render them.
- **A 5-minute session cache.** `requireAuth`'s positive-result cache (see **Auth: Neon
  Auth, not a JWT**) keeps a repeat request from round-tripping to Neon Auth.
- **`Server-Timing: db;dur=…`** on every API response, so real database time is visible
  in browser devtools with no extra instrumentation.
- **The CMS fetches in parallel and shows skeletons.** The workspace requests
  collections and the active collection's records at the same time instead of waiting
  for collections to resolve first, and the record editor shows a skeleton placeholder
  while a record (or a lazy-loaded rich-text editor) is still loading.

## Publishing (CMS → Vercel)

Editors change data, then click **Publish** in the CMS top bar. That runs the **Publish
transition** (flips queued records to published in the data store) and then triggers
`POST /api/deploy` (a Vercel Deploy Hook that rebuilds the static site), polling
`GET /api/deploy-status` for live state: **queued → building → deployed ✓** (or failed).
Configure `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, and `VERCEL_PROJECT_ID` in
`apps/api`; when unset, the flow degrades gracefully with a clear message.

## Deploying to Vercel

The three apps deploy as three separate Vercel projects, each rooted at its own
directory:

| Vercel project | Root directory | Framework preset | Key env vars |
| --- | --- | --- | --- |
| web | `apps/web` | Astro | `VITE_SITE_URL`, `API_ORIGIN` (required — no local content fallback) |
| cms | `apps/cms` | Vite | `API_ORIGIN` (optionally `VITE_API_URL`) |
| api | `apps/api` | Other/Node (Vercel Functions) | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_ORIGIN`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optionally `PUBLISH_TOKEN` and `API_ALLOWED_ORIGINS` |

`web` and `cms` each set `API_ORIGIN` to the deployed `api` project's URL; their
`vercel.ts` files then rewrite `/api/(.*)` to `${API_ORIGIN}/api/$1` at the edge (a
production build fails fast if `API_ORIGIN` is missing). Pull the `api` project's Neon
values from `neon-env export --format dotenv` (see **Neon setup**) rather than typing
them by hand.
