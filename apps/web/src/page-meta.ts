import { getContentSource, type ContentEntry } from "./content";
import { site, type SeoMetadata } from "./site";

/**
 * Central page metadata, decoupled from the page files themselves so the
 * sitemap.xml and llms.txt endpoints can enumerate every indexable page.
 * Each `src/pages/*.astro` route imports its entry and passes `seo` to the
 * layout; content-derived entries are resolved from the content source at
 * build time.
 */

export type PageMeta = {
  path: string;
  includeInSitemap: boolean;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  seo: SeoMetadata;
};

export const homeMeta: PageMeta = {
  path: "/",
  includeInSitemap: true,
  changefreq: "weekly",
  priority: 1,
  seo: {
    title: "Three Acts | Static marketing website starter",
    description:
      "Three Acts is a marketing website starter for story-led launches, conversion pages, and static SEO performance.",
    canonicalPath: "/",
    type: "website"
  }
};

export const aboutMeta: PageMeta = {
  path: "/about",
  includeInSitemap: true,
  changefreq: "monthly",
  priority: 0.7,
  seo: {
    title: "About Three Acts",
    description:
      "Meet the marketing strategy behind Three Acts: sharp positioning, static performance, and CMS-backed launch operations.",
    canonicalPath: "/about",
    type: "website"
  }
};

/** Hydrated at runtime: not prerendered with data, so keep it out of the index. */
export const dashboardMeta: PageMeta = {
  path: "/dashboard",
  includeInSitemap: false,
  seo: {
    title: "Dashboard | Three Acts",
    description: "Authenticated dashboard shell that runs as a client-side app.",
    canonicalPath: "/dashboard",
    noindex: true
  }
};

export const notFoundMeta: PageMeta = {
  path: "/404",
  includeInSitemap: false,
  seo: {
    title: "Page not found | Three Acts",
    description: "The page you were looking for could not be found.",
    canonicalPath: "/404",
    noindex: true
  }
};

export const blogIndexMeta: PageMeta = {
  path: "/blog",
  includeInSitemap: true,
  changefreq: "weekly",
  priority: 0.8,
  seo: {
    title: "Blog | Three Acts",
    description: "Notes on static-first delivery, islands architecture, and CMS-driven publishing.",
    canonicalPath: "/blog",
    type: "website"
  }
};

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

export function blogPostMeta(post: ContentEntry): PageMeta {
  return {
    path: `/blog/${post.slug}`,
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
    }
  };
}

/** Every sitemap-worthy page, content routes included. Used by sitemap.xml and llms.txt. */
export async function getSitemapPages(): Promise<PageMeta[]> {
  const source = await getContentSource();
  const posts = await source.listPosts();
  const pages = [homeMeta, aboutMeta, dashboardMeta, blogIndexMeta, ...posts.map(blogPostMeta)];
  return pages.filter((page) => page.includeInSitemap);
}
