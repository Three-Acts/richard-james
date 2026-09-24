import type { ContentSource } from "./content-source";
import { mockContentSource } from "./mock-source";

export type { ContentEntry, ContentSource } from "./content-source";

/**
 * Resolves the active content source.
 *
 * When both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (baked in
 * at build time, live in dev), the Supabase source is loaded lazily. Otherwise
 * the mock source keeps builds working with zero configuration — and the
 * Supabase client (and its dependencies) is never imported.
 */
let cached: Promise<ContentSource> | null = null;

async function resolveContentSource(): Promise<ContentSource> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (Boolean(url) !== Boolean(anonKey)) {
    throw new Error(
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set to use the Supabase content source — only one was provided."
    );
  }

  let source: ContentSource;

  if (url && anonKey) {
    const { createSupabaseContentSource } = await import("./supabase-source");
    source = createSupabaseContentSource(url, anonKey);
  } else {
    source = mockContentSource;
  }

  console.info(`[content] source: ${source.name}`);

  if (source.name === "mock" && process.env.VERCEL_ENV === "production") {
    console.warn(
      "[content] Production Vercel build is using the mock content source — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to publish real content."
    );
  }

  return source;
}

export function getContentSource(): Promise<ContentSource> {
  if (!cached) {
    cached = resolveContentSource();
  }
  return cached;
}
