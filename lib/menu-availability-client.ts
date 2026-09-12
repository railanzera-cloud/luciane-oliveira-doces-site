import {
  type AvailabilityStatus,
  type MenuAvailabilityItem,
} from "@/app/menu-availability";
import { getSupabaseClient, getSupabaseConfigurationIssue } from "@/lib/supabase";
export { loadRemoteAvailability } from "@/lib/public-menu-availability";

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error(getSupabaseConfigurationIssue() ?? "Supabase indisponível.");
  return client;
}

export async function updateOrdersOpen(ordersOpen: boolean, userId: string): Promise<void> {
  const client = requireClient();
  const { data, error } = await client
    .from("store_settings")
    .update({
      value: ordersOpen,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("key", "orders_open")
    .select("key")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("O registro store_settings/orders_open não foi encontrado.");
}

export async function updateMenuItemStatus(
  item: MenuAvailabilityItem,
  status: AvailabilityStatus,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { data, error } = await client
    .from("menu_availability")
    .update({
      status,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("item_key", item.itemKey)
    .select("item_key")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`O cadastro de disponibilidade de ${item.name} ainda não existe. Solicite a inclusão somente desse item no Supabase. Não execute o seed completo.`);
  }
}
