import { createClient } from "@supabase/supabase-js";

const defaultSupabaseUrl = "https://fmbavjpqbcodbsusjyzs.supabase.co";
const defaultPublishableKey = "sb_publishable_CIPPSOR20LHL-cHyUg6oRw_BIo0FSWV";

function cleanPublicValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^(["'])(.*)\1$/, "$2").trim();
}

function normalizeSupabaseUrl(value: string | undefined) {
  try {
    const url = new URL(cleanPublicValue(value) ?? defaultSupabaseUrl);
    if (url.protocol !== "https:" || url.hostname !== "fmbavjpqbcodbsusjyzs.supabase.co") {
      return defaultSupabaseUrl;
    }

    // The dashboard also shows a REST endpoint ending in /rest/v1/. Supabase
    // Auth needs the project origin instead, so discard any accidental path.
    return url.origin;
  } catch {
    return defaultSupabaseUrl;
  }
}

// Vercel reads these values from the project environment. The public fallbacks
// keep existing previews working while the deployment is being migrated.
const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey =
  cleanPublicValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
  defaultPublishableKey;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
