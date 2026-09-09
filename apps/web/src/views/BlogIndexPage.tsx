import type { ContentEntry } from "../content";
import { Section } from "../components/layout/section";
import { Typography } from "../components/ui/typography";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogIndexPage({ posts }: { posts: ContentEntry[] }) {
  return (
    <Section.Root className="py-20">
      <Section.Container className="max-w-5xl">
        <Typography.Eyebrow>Writing</Typography.Eyebrow>
        <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight landscape:text-6xl">Blog</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
          Content is fetched from the configured source at build time and prerendered into static pages.
        </p>

        <ul className="mt-12 grid gap-px border border-black bg-black">
          {posts.map((post) => (
            <li key={post.slug} className="bg-white">
              <a className="flex flex-col gap-2 p-6 transition hover:bg-black hover:text-white" href={`/blog/${post.slug}`}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">{formatDate(post.publishedAt)}</span>
                <span className="text-2xl font-semibold tracking-tight">{post.title}</span>
                <span className="max-w-2xl text-base leading-7 opacity-80">{post.excerpt}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section.Container>
    </Section.Root>
  );
}
