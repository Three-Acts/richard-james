# Three Acts React

Vite, React, and Tailwind monorepo with a static public web app and an auth-gated CMS app.

## Apps

- `apps/web` - public website with static HTML generation, route-level SEO metadata, sitemap generation, and public `robots.txt`.
- `apps/cms` - private CMS shell with `noindex,nofollow`, disallowing `robots.txt`, and a provider-shaped auth interface ready for Clerk, Auth0, or Supabase.
- `packages/utils` - shared utility helpers such as `cn`, `clsx`, and `cv`, exported from `@three-acts/utils`.
- `packages/config` - shared theme tokens consumed by Tailwind.

Base UI is installed per app through `@base-ui-components/react`, and web-specific template components live inside `apps/web`.

## Template UI

Template components use element-scoped dot notation and subpath exports for tree shaking:

```tsx
import { Button } from "./components/template/button";
import { Card } from "./components/template/card";
import { Section } from "./components/template/section";
import { Typography } from "./components/template/typography";

<Section.Root tone="panel">
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
pnpm build
pnpm lint
pnpm typecheck
```

Set `VITE_SITE_URL` before `pnpm build:web` to control canonical URLs and sitemap locations.
