import { createBrowserClient } from "@supabase/ssr";

import { hasSupabaseEnv, requirePublicSupabaseEnv } from "@/lib/env";

export function createClient() {
  if (!hasSupabaseEnv) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = requirePublicSupabaseEnv();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
