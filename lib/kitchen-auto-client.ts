import type { SupabaseClient } from "@supabase/supabase-js";

export type KitchenAutoMode = {
  enabled: boolean;
  started_at: string | null;
  print_queue_enabled: boolean;
  print_queue_cutoff: string | null;
};

function parseControl(raw: unknown): KitchenAutoMode {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Estado da cozinha inválido.");
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled !== "boolean" || typeof r.print_queue_enabled !== "boolean") {
    throw new Error("Controle da cozinha incompleto.");
  }
  return {
    enabled: r.enabled,
    started_at: typeof r.started_at === "string" ? r.started_at : null,
    print_queue_enabled: r.print_queue_enabled,
    print_queue_cutoff: typeof r.print_queue_cutoff === "string" ? r.print_queue_cutoff : null,
  };
}

export async function loadKitchenAutoMode(client: SupabaseClient): Promise<KitchenAutoMode> {
  const { data, error } = await client.rpc("admin_get_kitchen_auto_mode_v1");
  if (error) throw new Error("O Modo Cozinha ainda não está disponível: " + error.message);
  return parseControl(data);
}

export async function setKitchenAutoMode(client: SupabaseClient, enabled: boolean): Promise<KitchenAutoMode> {
  const { data, error } = await client.rpc("admin_set_kitchen_auto_mode_v1", { p_enabled: enabled });
  if (error) {
    if (/kitchen_print_queue_paused/.test(error.message || "")) throw new Error("Ative a fila da impressora antes do modo automático.");
    throw new Error("Não foi possível alterar o Modo Cozinha: " + error.message);
  }
  return parseControl(data);
}

export async function setKitchenPrintQueue(client: SupabaseClient, enabled: boolean): Promise<void> {
  const { error } = await client.rpc("admin_set_kitchen_print_enabled", { p_enabled: enabled });
  if (error) throw new Error("Não foi possível alterar a fila: " + error.message);
}
