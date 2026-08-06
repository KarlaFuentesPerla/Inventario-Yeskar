import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmbavjpqbcodbsusjyzs.supabase.co";
const supabasePublishableKey = "sb_publishable_CIPPSOR20LHL-cHyUg6oRw_BIo0FSWV";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
