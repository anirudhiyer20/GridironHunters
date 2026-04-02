const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const appName = "GridironHunters";
export const hasSupabaseEnv =
  supabaseUrl.length > 0 && supabasePublishableKey.length > 0;

export function getProjectHost() {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "Invalid NEXT_PUBLIC_SUPABASE_URL";
  }
}

export function getPublicSupabaseEnv() {
  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}
