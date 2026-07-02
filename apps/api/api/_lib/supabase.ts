import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client foundation.
 *
 * Uses the SERVICE ROLE key, which bypasses row-level security and must never
 * reach the browser. Use this for privileged, server-side work that is unsafe
 * on the client: CMS writes, moderation, webhook processing, payment callbacks,
 * and validated mutations. Read-only public content is fetched with the anon
 * key directly in `apps/web`.
 *
 * Returns `null` when unconfigured so callers can respond cleanly instead of
 * throwing at import time.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (cached) {
    return cached;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}
