import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabasePublicConfiguration,
  hasSupabaseConfiguration,
} from "@/lib/supabase-config";

export { getSupabaseConfigurationIssue, hasSupabaseConfiguration } from "@/lib/supabase-config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfiguration()) return null;
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicConfiguration();
    browserClient = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
