import { BlogIndexPage } from "./pages/BlogIndexPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { getContentSource } from "./content";
import type { ContentEntry } from "./content";
import { codeRoutes, site, type AppRoute } from "./routes";

/**
 * Build-only route resolution. Runs in the Node build/SSR context (never the
 * browser bundle), so it may import the content layer and expand collections
 * into concrete static routes with their data baked into `render`.
 */

function articleStructuredData(post: ContentEntry) {
  return {
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: post.author ?? site.name },
    image: post.coverImage ? new URL(post.coverImage, site.url).toString() : undefined,
    mainEntityOfPage: new URL(`/blog/${post.slug}`, site.url).toString()
  };
}

export async function getRoutes(): Promise<AppRoute[]> {
  const source = await getContentSource();
  const posts = await source.listPosts();

  const blogIndex: AppRoute = {
    path: "/blog",
    label: "Blog",
    renderMode: "static",
    includeInSitemap: true,
    changefreq: "weekly",
    priority: 0.8,
    seo: {
      title: "Blog | Three Acts",
      description: "Notes on static-first delivery, islands architecture, and CMS-driven publishing.",
      canonicalPath: "/blog",
      type: "website"
    },
    render: () => <BlogIndexPage posts={posts} />
  };

  const postRoutes: AppRoute[] = posts.map((post) => ({
    path: `/blog/${post.slug}`,
    label: post.title,
    renderMode: "static",
    includeInSitemap: true,
    changefreq: "monthly",
    priority: 0.6,
    seo: {
      title: `${post.title} | Three Acts`,
      description: post.excerpt,
      canonicalPath: `/blog/${post.slug}`,
      type: "article",
      image: post.coverImage,
      keywords: post.tags,
      lastmod: post.updatedAt ?? post.publishedAt,
      structuredData: articleStructuredData(post)
    },
    render: () => <BlogPostPage post={post} />
  }));

  return [...codeRoutes, blogIndex, ...postRoutes];
}
