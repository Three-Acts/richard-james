# ADR 0001: Zero-JS static rendering with islands (pure Vite + React)

- Status: Superseded by [ADR 0002](./0002-astro-migration.md)
- Date: 2026-07-02

## Context

The public web app must ship fast, clean, indexable static HTML — the Astro goal — but the stack is intentionally **pure Vite + React**, not a meta-framework. Content lives in Supabase and should be dynamic in development but baked at build. The app also needs a few genuinely interactive and authenticated pages.

## Decision

Three per-route rendering modes, selected by `renderMode` in `apps/web/src/routes.tsx`:

1. **Static, no interactivity** — server-rendered to HTML at build, shipping **zero JavaScript** (only CSS).
2. **Static with islands** — the page is static HTML; interactive pieces are marked with `<Island>` and hydrated individually by a small runtime (`islands-client.tsx`). Only pages with an island load the runtime and that island's code-split chunk.
3. **Client (`renderMode: "client"`)** — a prerendered shell with baked SEO head that boots as an SPA (`entry-client.tsx`) and fetches live data at runtime.

Supporting decisions:

- **One render path, two lifecycles.** `entry-server.tsx` renders every route; dev (`server.mjs`) does it per-request via Vite SSR (live data), build (`scripts/prerender.mjs`) does it once and freezes the output. The client-build manifest drives which scripts (if any) each page gets.
- **Content is build-only.** `build-routes.ts` (Node-only) expands Supabase/mock collections into concrete routes; the browser bundle imports only `clientRoutes`, so content-generation code and the Supabase client never ship to the browser.
- **Client shells double as the SPA fallback.** Each `client` route writes its own `<route>/index.html`, so no host rewrite is needed and unknown paths still 404.

## Consequences

- Marketing pages are effectively an MPA (full-page navigation, zero JS); the app area is an SPA. Links between them use plain anchors; islands and client pages must be self-contained with JSON-serializable props.
- Adding a meta-framework later would replace `server.mjs` + `prerender.mjs`, but the route/content/island contracts would largely carry over.
- The approach is more moving parts than a single SPA, in exchange for shipping little or no JavaScript on content pages.
