import { createClient } from "@supabase/supabase-js";

// Vercel reads these values from the project environment. The public fallbacks
// keep existing previews working while the deployment is being migrated.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://fmbavjpqbcodbsusjyzs.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_CIPPSOR20LHL-cHyUg6oRw_BIo0FSWV";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
