# Three Acts React

Astro, React, Tailwind, and Vercel API monorepo with a static public web app, an auth-gated CMS app, and a server-side API bridge.

## Apps

- `apps/web` - public **Astro** website that prerenders to **zero-JS static HTML**, with React **islands** for interactivity, a **build-time content layer** (mock by default, Supabase-ready), route-level SEO + AEO metadata (JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`), build-time **AVIF** image compression, and a same-origin `/api/*` convention.
- `apps/cms` - private CMS shell with `noindex,nofollow`, disallowing `robots.txt`, a provider-shaped auth interface ready for Clerk, Auth0, or Supabase, and the same same-origin `/api/*` convention.
- `apps/api` - Vercel serverless API app for server-only template functionality such as CMS writes, payment callbacks, webhook handling, record validation, and integration bridges.
- `packages/utils` - shared utility helpers such as `cn`, `clsx`, and `cv`, exported from `@three-acts/utils`.
- `packages/config` - shared theme tokens consumed by Tailwind.

Base UI is installed per app through `@base-ui-components/react`, and web-specific template components live inside `apps/web`.

## Template UI

Template components use element-scoped dot notation and subpath exports for tree shaking:

```tsx
import { Section } from "./components/layout/section";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Typography } from "./components/ui/typography";

<Section.Root>
  <Section.Container>
    <Typography.Eyebrow>Marketing site system</Typography.Eyebrow>
    <Card.Marketing title="Launch pages" body="Campaign-ready pages." />
    <Button.Root>Save draft</Button.Root>
    <Button.Link href="/about">About</Button.Link>
  </Section.Container>
</Section.Root>
```

## Scripts

```sh
npm install
npm run dev:web
npm run dev:cms
npm run dev:api
npm run build
npm run lint
npm run typecheck
```

Set `VITE_SITE_URL` before `npm run build:web` to control canonical URLs and sitemap locations. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to source content from Supabase instead of the built-in mock (see `apps/web/.env.example`).

## API App

`apps/api` is designed to deploy as its own Vercel project from the `apps/api` root. It starts with:

- `GET /api/health` - health check endpoint.
- `GET /api/meta` - template metadata endpoint.
- `POST /api/deploy` - trigger a Vercel deploy hook (used by the CMS Publish flow).
- `GET /api/deploy-status` - normalized Vercel deployment state for progress feedback.
- `API_ALLOWED_ORIGINS` - optional comma-separated browser origins for direct cross-origin calls.
- Server-side Supabase (service-role) client foundation in `api/_lib/supabase.ts` for privileged writes/webhooks/payment callbacks. See `apps/api/.env.example` for all variables.

`apps/web` and `apps/cms` call `/api/*` by default. In local development, their Vite dev servers proxy `/api/*` to `API_ORIGIN`. In Vercel, their `vercel.ts` files rewrite `/api/*` to the deployed API app. This keeps browser requests same-origin and avoids per-app CORS configuration for normal traffic.

For local development, copy the relevant examples:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/cms/.env.example apps/cms/.env
```

Set `API_ORIGIN` in the web and CMS projects to the API origin, for example `https://your-api.vercel.app`. The browser-facing API client still calls `/api/*`; the dev server or Vercel rewrite performs the bridge.

If a specific deployment needs to call the API directly from the browser, set `VITE_API_URL` to the full API base URL and allow the caller with `API_ALLOWED_ORIGINS`.

## Web rendering model

`apps/web` is an [Astro](https://astro.build) app (`output: "static"`, React via `@astrojs/react`). Pages live in `src/pages/*.astro` and compose React views from `src/views/` and sections/primitives from `src/components/`. Three kinds of pages:

- **Static, no interactivity** → no `client:*` directive, prerendered HTML + CSS, **zero JavaScript**.
- **Static with islands** → the page is static HTML; interactive components get a `client:*` directive and hydrate individually. See _Islands_ below.
- **Client routes** → the page's root React component uses `client:load`, server-renders as a static shell with baked SEO head, then hydrates and fetches live data at runtime (login, account, dashboard, checkout). `/dashboard` is the reference example.

In development, `npm run dev:web` (`astro dev`) renders every request with live data and mirrors production. `npm run build:web` (`astro build`) freezes the same output into static files, then compresses images (`scripts/optimize-images.mjs`).

Per-page SEO + sitemap metadata is centralized in `src/page-meta.ts` and rendered by `src/layouts/BaseLayout.astro`. Only pages with `includeInSitemap: true` are written to `sitemap.xml` (with `lastmod`/`changefreq`/`priority`) by the `src/pages/sitemap.xml.ts` endpoint; `robots.txt` and `llms.txt` are generated the same way. `src/pages/404.astro` emits `404.html`.

### Islands

An island is a self-contained React component with JSON-serializable props that server-renders into the HTML (indexable, works with no JS) and hydrates on its own. Render it in an `.astro` page with a client directive, e.g. `<ContactFormIsland client:visible />`. Only pages containing an island load Astro's tiny hydration runtime + that island's chunk. The home page contact form is the reference example.

### Content layer

Content is read through a source in `src/content/`:

- `mock-source.ts` is the default, so builds work with **zero credentials**.
- `supabase-source.ts` activates automatically when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (read-only, anon key). It is loaded lazily, so mock builds never bundle Supabase.

`src/pages/blog/[slug].astro` expands the collection into concrete static routes via `getStaticPaths`, with per-entry SEO from `blogPostMeta` in `src/page-meta.ts`. The content source is only imported from build-time code, so the Supabase client never ships to the browser. Server-side writes belong in `apps/api`, not here.

### Images

Put owned raster images in `apps/web/public/` and render them with `<Image>` (`src/components/ui/image`). The build emits an `.avif` sibling for every `.png`/`.jpg`/`.jpeg`/`.webp`, and `<Image>` renders a zero-JS `<picture>` that prefers AVIF with the original as fallback. External/CDN URLs pass through as a plain `<img>`.

## Publishing (CMS → Vercel)

Editors change data, then click **Publish** in the CMS top bar. That calls `POST /api/deploy` (which triggers a Vercel Deploy Hook to rebuild the static site) and polls `GET /api/deploy-status` for live state, surfacing progress in a bottom-right toast: **queued → building → deployed ✓** (or failed). Configure `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, and `VERCEL_PROJECT_ID` in `apps/api`; when unset, the flow degrades gracefully with a clear message.
