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

export type CrocanteInventoryRow = {
  item_key: "crocante_copo_ninho" | "crocante_copo_chocolate";
  total: number;
  reserved: number;
  available: number;
  enabled: boolean;
  version: number;
  shortages: number;
};

/** Exclusivamente para conta autenticada: nunca confiar em contador local. */
export async function loadCrocanteInventory(): Promise<CrocanteInventoryRow[]> {
  const { data, error } = await requireClient().rpc("admin_get_crocante_inventory");
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("O controle de estoque ainda não está disponível no Supabase.");
  return data as CrocanteInventoryRow[];
}

export async function saveCrocanteInventory(input: {
  itemKey: CrocanteInventoryRow["item_key"];
  total: number;
  version: number;
  enabled: boolean;
}): Promise<CrocanteInventoryRow[]> {
  if (!Number.isInteger(input.total) || input.total < 0 || !Number.isInteger(input.version)) {
    throw new Error("Informe uma quantidade inteira válida.");
  }
  const { data, error } = await requireClient().rpc("admin_set_crocante_inventory", {
    p_item_key: input.itemKey,
    p_total: input.total,
    p_version: input.version,
    p_enabled: input.enabled,
  });
  if (error) {
    if (/crocante_inventory_conflict_reload/.test(error.message)) throw new Error("O estoque mudou em outra sessão. Atualize antes de salvar.");
    if (/crocante_inventory_below_reserved/.test(error.message)) throw new Error("Essa quantidade é menor que as unidades reservadas por clientes.");
    throw error;
  }
  if (!Array.isArray(data)) throw new Error("O servidor não confirmou a atualização do estoque.");
  return data as CrocanteInventoryRow[];
}
