import { createClient } from "@supabase/supabase-js";
import type { ContentEntry, ContentSource } from "./content-source";

/**
 * Read-only Supabase content source, used at build/SSR time when the Supabase
 * env vars are configured. It reads a published projection of editorial data
 * with the anon key only — never a service-role key (writes go through the
 * server-side API in `apps/api`).
 *
 * Expected table `posts` columns (adjust `mapRow` to your schema):
 *   slug, title, excerpt, body, cover_image, published_at, updated_at,
 *   author, tags (text[]), status
 */

type PostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  published_at: string;
  updated_at: string | null;
  author: string | null;
  tags: string[] | null;
};

function mapRow(row: PostRow): ContentEntry {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    coverImage: row.cover_image ?? undefined,
    publishedAt: row.published_at,
    updatedAt: row.updated_at ?? undefined,
    author: row.author ?? undefined,
    tags: row.tags ?? undefined
  };
}

export function createSupabaseContentSource(url: string, anonKey: string): ContentSource {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false }
  });

  return {
    name: "supabase",
    async listPosts() {
      const { data, error } = await client
        .from("posts")
        .select("slug,title,excerpt,body,cover_image,published_at,updated_at,author,tags")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) {
        throw new Error(`Supabase listPosts failed: ${error.message}`);
      }

      return (data as PostRow[]).map(mapRow);
    },
    async getPost(slug) {
      const { data, error } = await client
        .from("posts")
        .select("slug,title,excerpt,body,cover_image,published_at,updated_at,author,tags")
        .eq("status", "published")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase getPost failed: ${error.message}`);
      }

      return data ? mapRow(data as PostRow) : null;
    }
  };
}
