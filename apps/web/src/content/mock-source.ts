import type { ContentEntry, ContentSource } from "./content-source";

/**
 * Default content source. Ships seed data so `npm run build:web` produces a
 * complete static site with zero credentials. Swap in the Supabase source by
 * setting the Supabase env vars (see `./index.ts`).
 */

const posts: ContentEntry[] = [
  {
    slug: "static-first-launch-playbook",
    title: "The static-first launch playbook",
    excerpt:
      "How Three Acts prerenders marketing pages to fast, indexable HTML while keeping editorial data in Supabase.",
    body: "Static-first means the browser receives finished HTML, not a loading spinner. We fetch content from Supabase at build time, prerender every marketing route, and ship zero JavaScript on pages that do not need it. Interactive pieces become islands that hydrate on their own.",
    coverImage: "/content/launch-playbook.png",
    publishedAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-28T12:00:00.000Z",
    author: "Three Acts",
    tags: ["performance", "seo", "workflow"]
  },
  {
    slug: "islands-without-a-framework",
    title: "Islands without a meta-framework",
    excerpt:
      "Pure Vite and React can deliver Astro-style islands. Here is the small runtime that makes it work.",
    body: "An island is a self-contained component that is server-rendered into the HTML and then hydrated on its own. A tiny client runtime scans for island markers, imports only the matching chunk, and hydrates each one. The rest of the page stays static HTML.",
    coverImage: "/content/islands.png",
    publishedAt: "2026-06-25T09:00:00.000Z",
    author: "Three Acts",
    tags: ["react", "vite", "architecture"]
  },
  {
    slug: "publishing-from-the-cms",
    title: "Publishing from the CMS to Vercel",
    excerpt:
      "Editors change data, hit Publish, and watch a real Vercel deploy move from queued to ready.",
    body: "The CMS talks to a small server-side API that triggers a Vercel deploy hook and polls deployment status. The editor sees live progress: queued, building, and finally deployed. The static site rebuilds with the latest published content.",
    publishedAt: "2026-06-30T09:00:00.000Z",
    author: "Three Acts",
    tags: ["cms", "vercel", "workflow"]
  }
];

const sorted = [...posts].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);

export const mockContentSource: ContentSource = {
  name: "mock",
  async listPosts() {
    return sorted.map((post) => ({ ...post }));
  },
  async getPost(slug) {
    const match = sorted.find((post) => post.slug === slug);
    return match ? { ...match } : null;
  }
};
