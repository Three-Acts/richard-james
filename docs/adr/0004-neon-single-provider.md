# ADR 0004: Neon as the single provider behind the API

- Status: Accepted
- Date: 2026-09-24

## Context

This portfolio was migrated from a standalone Astro site (the subject of
[ADR 0001](0001-static-islands-rendering.md) and [ADR 0002](0002-astro-migration.md))
into a template monorepo with `apps/web`, a private `apps/cms`, and a server-side
`apps/api`. [ADR 0003](0003-pluggable-cms-backend.md) already required that any
backend be swappable behind `CmsDataStore` / `CmsBlobStore`, reached only through
`apps/api`'s REST bridge. This migration needed the same guarantee extended to two more
concerns the original template didn't have: where editors log in, and where the public
site's content comes from at build time. The requirement was that web, CMS auth,
storage, and data all go through `apps/api`, so swapping the provider behind any of them
later means touching `apps/api` only — never `apps/web` or `apps/cms`.

Neon was chosen as that one provider: Postgres for content, Neon object storage
(S3-compatible) for images, and Neon Auth (managed Better Auth) for editor login, all on
a single Neon project (`winter-tooth-70046024`, branch `production`).

## Decision

- **One provider, one gateway.** Neon supplies Postgres, object storage, and auth;
  `apps/api` is the only thing that ever calls Neon. `apps/web` reads a build-time
  content API; `apps/cms` reads/writes through the existing REST bridge and a new auth
  bridge. Supabase and `@supabase/supabase-js` are removed entirely.
- **`pg`, not an ORM, over a pooled connection.** `NeonDataStore` runs parameterised SQL
  through a `pg` `Pool` on `DATABASE_URL` (PgBouncer, transaction mode), registered with
  `@vercel/functions`'s `attachDatabasePool` so a frozen/recycled function instance
  drains its connections instead of leaking them. Schema migrations run separately over
  `DATABASE_URL_UNPOOLED` (a direct connection), since DDL and other session-level work
  don't work through a transaction-mode pooler.
- **S3 API for storage, not a bespoke SDK.** `NeonBlobStore` uses
  `@aws-sdk/client-s3` with `forcePathStyle: true` against Neon's S3-compatible
  endpoint, so the same interface could later point at any other S3-compatible
  provider (Cloudflare R2, AWS S3 itself) with no shape change.
- **Session-token auth, not the raw 15-minute JWT.** Neon Auth's JWTs are too
  short-lived to hand to a browser client that should stay signed in for a workday.
  Instead, `apps/api` captures the opaque session cookie Neon Auth sets on sign-in
  (`__Secure-neon-auth.session_token`, confirmed empirically; the assumed
  `neonauth` name in the original spec was wrong) and hands that value to the CMS as
  its bearer token. Verification replays it as a cookie against Neon Auth's
  `get-session`, with a 5-minute in-memory positive-result cache (keyed by token,
  capped at 500 entries) so a burst of CMS requests doesn't round-trip to Neon Auth on
  every call. Sessions last 7 days.
- **A build-time content API, and the only content source `apps/web` has.**
  `GET /api/content/{site,projects,projects/:slug,pages,pages/:slug}` returns only
  published records, shaped to `SiteContent`/`ProjectContent`/`PageContent`, with
  `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. `apps/web`'s
  `ContentSource` always fetches this over HTTP; there is no local data, no `local`
  option, and no `CONTENT_SOURCE` env var. `API_ORIGIN` is required in every
  environment, and `getContentSource()` probes the API up front so a missing or
  unreachable API fails the build/dev server immediately with one clear error.
- **No dev-mode bypass for auth, and no mock CMS Backend.** `requireAuth` 503s in
  every environment (not just production) when neither `PUBLISH_TOKEN` nor
  `NEON_AUTH_BASE_URL` is configured. ADR 0003's `mock` `CmsBackend`/`AuthClient`
  implementations were deleted outright, not just left undefaulted, once a real
  Neon-backed dev flow existed end-to-end. `apps/cms/.env.example` is now just
  `API_ORIGIN` (plus an optional `VITE_API_URL`) — no `VITE_CMS_BACKEND`,
  `VITE_CMS_AUTH`, or `VITE_PUBLISH_TOKEN`. The practical effect: local CMS/web
  development requires the repo linked to the same Neon project as staging and
  production (see Consequences).
- **A `reference` field type**, so one collection's records can point at another's,
  stored as the referenced record's id (a `text` column) and validated server-side
  against the referenced collection when required. It shipped as a generic capability
  of the schema package; no collection uses one today (see the next bullet and
  Alternatives).
- **A project's gallery lives on the `projects` row, not a child collection.** A
  `gallery` field type stores the whole ordered image set as one JSON
  `{ src, caption? }[]` value on the `projects` record itself. The CMS renders it as a
  multi-file drop zone with a thumbnail grid (drag to add, reorder, caption, remove);
  each file uploads through the same asset route into the bucket, but there is no
  per-image database row. `apps/api`'s content-shaping layer (`content.ts`) builds
  `ProjectContent.images` by parsing that one field. Chosen over a child collection for
  two reasons: it matches how editors actually think about and edit a gallery (one
  drag-and-drop, reorderable list, not a separate record per image to open and save),
  and it turns "load a project's images" from a join/second query into reading a column
  already on the row — far fewer database round trips, both for the Content API and for
  the CMS's own record list.
- **Seed data and images live in `apps/api`, not `apps/web`.** `apps/api/seed/data/*.ts`
  and `apps/api/seed/images/**` are the one checked-in copy of the portfolio's content
  (`apps/web` has none). `npm run db:seed` imports the data files with normal static
  `import`s (they no longer depend on any Vite/Astro-only global, so the seed script
  doesn't need a runtime-computed `file://` import) and walks the images directory,
  uploading to the `public` bucket and upserting site settings, pages, and projects —
  including each project's `gallery` field — as published.
- **Rich text is stored as markdown, not HTML.** The new `richtext` field type
  (`projects.description`, `pages.body`) stores GitHub-flavoured markdown plus `<u>`
  for underline, edited through a TipTap WYSIWYG toolbar (lazy-loaded, and round-tripped
  through `tiptap-markdown` so what's saved is still markdown) rather than storing
  TipTap's own HTML output. The Content API keeps serving plain markdown text, and
  `apps/web` sanitizes and renders it at build time (`marked` + `sanitize-html`) — the
  stored value stays diffable and the same shape it always was, and there's exactly one
  place (the web renderer) that turns editor input into HTML, not two.
- **Site Settings is a Singleton Collection.** `singleton: true` opens its one record
  directly as a form, with no list view and no New/Delete controls — matching the fact
  that there's exactly one row and creating or deleting it was never a real operation.
- **Pages are fixed.** `allowCreate`/`allowDelete: false` on the Pages collection: editors
  edit copy, imagery, and SEO fields, but can't add or remove a page, since each one
  (About, the essay) is looked up by a hardcoded route on the site, not discovered from
  the collection. Its `key` field was renamed `slug` to match Projects' naming and to
  render as a link to the live page the same way.
- **The contact form is gone entirely.** `contact-submissions` and `POST /api/contact`
  were removed rather than kept unused; the site's Contact page is a static mailto/tel
  index with nothing to submit. Re-adding a form later means restoring both sides
  together, not just the endpoint.
- **Images are optimised client-side, not server-side.** `apps/cms/src/lib/optimize-image.ts`
  downscales and re-encodes to AVIF (via a lazy-loaded WASM encoder, falling back to
  canvas AVIF/WebP/original; SVGs skipped) in the editor's browser before upload, and
  the 4MB upload limit is enforced on the optimised result. Chosen over a server-side
  image pipeline so `apps/api` stays a thin data/auth/storage gateway with no
  image-processing dependency, cost, or latency of its own.
- **Uploads happen on Save, not on drop.** A picked file is staged as a local `blob:`
  preview immediately, but only actually uploaded (concurrency 3) right before the
  record is saved; Discard uploads nothing. Chosen so an editor who picks a file and
  then abandons the edit never leaves an orphaned object in the Blob Store with no
  record pointing at it.

## Alternatives considered

- **Browser calls the Neon Auth SDK directly.** Rejected for the same reason ADR 0003
  rejected a browser-to-Supabase client: it ships a vendor SDK to the CMS bundle and
  moves a credential-bearing integration into client code. Keeping `apps/api` as the
  sole caller means an identity-provider swap only ever touches `neon-auth.ts` and
  `auth.ts`.
- **JWT + JWKS verification instead of session-cookie replay.** Considered because it
  would avoid a network call per request. Rejected for now because Neon Auth's JWTs
  expire in 15 minutes, which is too short to hand to a CMS session, and because
  `requireAuth`'s 5-minute positive cache already removes most of the round-trip cost.
  `NEON_AUTH_JWKS_URL` is documented in `apps/api/.env.example` as a future option for
  verifying tokens minted by other Neon services, not built now.
- **Cloudflare R2 for object storage instead of Neon's built-in bucket.** Rejected for
  this migration: Neon's storage is provisioned by the same `neon.ts` config as Postgres
  and Auth, so there is one fewer account/credential to manage. `CmsBlobStore` already
  makes R2 a drop-in future option if that trade-off changes.
- **Keep images in `apps/web/public/` only, with no object storage.** Rejected because
  editors need to upload new project images from the CMS without a code deploy; a Blob
  Store is required for that regardless of which provider backs it. The seeded images
  stay in git as well (see Consequences), so this wasn't an either/or.
- **A `project-images` child collection**, one record per gallery image with a
  `reference` field back to its `projects` record (sort order and caption per record).
  This shipped first, then was reverted in favor of the `gallery` field: it meant
  opening a separate record to add or reorder every single image, an extra table and an
  extra query (join) to read a project's gallery at all, and it made reordering a
  multi-record write instead of saving one field. `schema-sql.ts` still carries the
  `drop table if exists project_images` cleanup for anyone who provisioned a database
  before this reversal. The `reference` field type itself was kept as a generic
  capability of the schema package rather than deleted, since it's still the right tool
  for a genuine one-to-many across separate collections, even though nothing uses it
  today.

## Consequences

- Every CMS request that needs verification makes an extra hop to `apps/api`, and on a
  cache miss a further hop from `apps/api` to Neon Auth's `get-session` — two network
  hops beyond what a same-process auth check would cost. The 5-minute cache keeps this
  off the hot path for a single editing session.
- Sign-up must be disabled by hand (`neon neon-auth config email-password update
  --disable-sign-up`) immediately after the first editor is created via
  `auth:create-editor`. Until that's run, anyone who discovers `NEON_AUTH_BASE_URL`
  could sign themselves up as an editor.
- Asset uploads through the CMS are still capped at 4MB by the base64 JSON request body
  (a Vercel body-size limit, unchanged from ADR 0003) — Neon object storage removes the
  storage-provider constraint but not this one. A presigned-upload flow remains future
  work.
- The seeded portfolio images are duplicated: once in git under `apps/api/seed/images`
  (`db:seed`'s input, and the only reproducible way to rebuild a database from scratch),
  and again in the Neon `public` bucket once seeded. The two can drift if the bucket is
  edited from the CMS without updating the seed copy; the CMS/bucket is the source of
  truth for a live site, `apps/api/seed/images` only for re-seeding a fresh database.
- Every Vercel build of `apps/web` — production or preview — now hard-fails without a
  reachable `API_ORIGIN`: each app's `vercel.ts` throws if `API_ORIGIN` is unset in a
  production build, and separately `getContentSource()` throws if the Content API
  itself is unset or unreachable, in every environment including local dev. There is no
  local/offline content path left to fall back to at all — a green build always means a
  live, reachable API answered every content request.
- Local development lost its zero-setup path: `npm run dev` no longer works without a
  Neon project already linked (`neon link`) and Neon Auth reachable — there is no
  mock/offline mode to develop the CMS or `apps/web` against. A new contributor's first
  step is always **Neon setup**, not `npm install && npm run dev`.
- Seed content (`apps/api/seed/data/*.ts`) was proofread against the live
  richardjamesart.com during this migration, catching and fixing one artwork dimension
  typo — a reminder that the seed is the editorial record now, not just fixture data.
