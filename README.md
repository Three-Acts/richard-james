# Three Acts React

Vite, React, Tailwind, and Vercel API monorepo with a static public web app, an auth-gated CMS app, and a server-side API bridge.

## Apps

- `apps/web` - public website with static HTML generation, route-level SEO metadata, sitemap generation, public `robots.txt`, and a same-origin `/api/*` convention for server-side work.
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
pnpm install
pnpm dev:web
pnpm dev:cms
pnpm dev:api
pnpm build
pnpm lint
pnpm typecheck
```

Set `VITE_SITE_URL` before `pnpm build:web` to control canonical URLs and sitemap locations.

## API App

`apps/api` is designed to deploy as its own Vercel project from the `apps/api` root. It starts with:

- `GET /api/health` - health check endpoint.
- `GET /api/meta` - template metadata endpoint.
- `API_ALLOWED_ORIGINS` - optional comma-separated browser origins for direct cross-origin calls.

`apps/web` and `apps/cms` call `/api/*` by default. In local development, their Vite dev servers proxy `/api/*` to `API_ORIGIN`. In Vercel, their `vercel.ts` files rewrite `/api/*` to the deployed API app. This keeps browser requests same-origin and avoids per-app CORS configuration for normal traffic.

For local development, copy the relevant examples:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/cms/.env.example apps/cms/.env
```

Set `API_ORIGIN` in the web and CMS projects to the API origin, for example `https://your-api.vercel.app`. The browser-facing API client still calls `/api/*`; the dev server or Vercel rewrite performs the bridge.

If a specific deployment needs to call the API directly from the browser, set `VITE_API_URL` to the full API base URL and allow the caller with `API_ALLOWED_ORIGINS`.

## Static and Live Web Routes

Routes in `apps/web/src/routes.tsx` declare a `renderMode`:

- `static` routes are prerendered into HTML files during `pnpm build:web`.
- `client` routes are available to the React app but are not prerendered. Use this for login, profile, account, dashboard, checkout, and other pages that must fetch live data at runtime.

Only routes with `includeInSitemap: true` are written to `sitemap.xml`.
