import {
  createFallbackAvailability,
  mergeRemoteAvailability,
  type AvailabilitySnapshot,
  type MenuAvailabilityRow,
} from "@/app/menu-availability";
import {
  getSupabaseConfigurationIssue,
  getSupabasePublicConfiguration,
} from "@/lib/supabase-config";

type StoreSettingRow = Record<string, unknown> & {
  key?: string;
  value?: unknown;
};

function readOrdersOpen(row: StoreSettingRow | null): boolean {
  const fallback = createFallbackAvailability().ordersOpen;
  const value = row?.value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "open", "available", "aberto"].includes(normalized)) return true;
    if (["false", "0", "closed", "unavailable", "fechado"].includes(normalized)) return false;
  }
  if (value && typeof value === "object" && "enabled" in value) {
    const enabled = (value as { enabled?: unknown }).enabled;
    if (typeof enabled === "boolean") return enabled;
  }
  return fallback;
}

async function fetchSupabaseRows<T>(path: string): Promise<T> {
  const { url, publishableKey } = getSupabasePublicConfiguration();
  if (!url || !publishableKey) {
    throw new Error(getSupabaseConfigurationIssue() ?? "Supabase indisponível.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(new URL(path, url), {
      headers: {
        Accept: "application/json",
        apikey: publishableKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Consulta de disponibilidade falhou (HTTP ${response.status}).`);
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadRemoteAvailability(): Promise<AvailabilitySnapshot> {
  const settingsQuery = "/rest/v1/store_settings?select=*&key=eq.orders_open&limit=1";
  const menuQuery = "/rest/v1/menu_availability?select=item_key,name,item_type,category_key,status,updated_at,updated_by";
  const [settingsRows, menuRows] = await Promise.all([
    fetchSupabaseRows<StoreSettingRow[]>(settingsQuery),
    fetchSupabaseRows<MenuAvailabilityRow[]>(menuQuery),
  ]);

  return mergeRemoteAvailability(menuRows, readOrdersOpen(settingsRows[0] ?? null));
}
