declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

function normalizeProjectUrl(value: string) {
  return value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

const url = typeof __SUPABASE_URL__ === "string" ? normalizeProjectUrl(__SUPABASE_URL__) : "";
const publishableKey = typeof __SUPABASE_PUBLISHABLE_KEY__ === "string"
  ? __SUPABASE_PUBLISHABLE_KEY__.trim()
  : "";

export function getSupabasePublicConfiguration() {
  return { url, publishableKey } as const;
}

export function hasSupabaseConfiguration(): boolean {
  return Boolean(url && publishableKey);
}

export function getSupabaseConfigurationIssue(): string | null {
  if (hasSupabaseConfiguration()) return null;
  return "SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY não foram configuradas no build.";
}
