import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, hasSupabaseEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicSupabaseEnv();

  return createClient(supabaseUrl, supabasePublishableKey);
}
