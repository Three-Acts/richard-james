import type { ContentEntry } from "../content";
import { Section } from "../components/layout/section";
import { Image } from "../components/ui/image";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPostPage({ post }: { post: ContentEntry }) {
  return (
    <Section.Root className="py-20">
      <Section.Container className="max-w-3xl">
        <a className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500 hover:text-black" href="/blog">
          &larr; Blog
        </a>
        <article className="mt-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {formatDate(post.publishedAt)}
              {post.author ? ` · ${post.author}` : ""}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight landscape:text-5xl">{post.title}</h1>
            <p className="mt-5 text-xl leading-8 text-neutral-700">{post.excerpt}</p>
          </header>

          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              className="mt-10 w-full border border-black"
              width={1200}
              height={630}
            />
          ) : null}

          <div className="mt-10 text-lg leading-8 text-neutral-800">
            {post.body.split("\n\n").map((paragraph, index) => (
              <p key={index} className="mt-6 first:mt-0">
                {paragraph}
              </p>
            ))}
          </div>

          {post.tags?.length ? (
            <ul className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag} className="border border-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </Section.Container>
    </Section.Root>
  );
}
