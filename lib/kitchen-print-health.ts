import type { SupabaseClient } from "@supabase/supabase-js";

export type KitchenPrintJobStatus = "pending" | "printing" | "printed" | "failed";
export type KitchenPrintJob = {
  id: string;
  order_uuid: string;
  kind: string;
  status: KitchenPrintJobStatus;
  created_at: string;
  updated_at: string;
  attempts: number;
};

export type KitchenPrintIssue = {
  id: string;
  kind: "failed" | "delayed";
  count: number;
  message: string;
};

export const KITCHEN_PRINT_DELAY_MS = 2 * 60 * 1000;
export const KITCHEN_ERROR_ALERT_INTERVAL_MS = 30 * 1000;
const PRINT_HEALTH_LOOKBACK_MS = 6 * 60 * 60 * 1000;

/**
 * Não anuncia pedidos antigos nem pendentes por pagamento/estoque indisponível
 * como "erro da impressora". Uma impressão falhada é sempre uma exceção real.
 */
export function summarizeKitchenPrintIssues(
  jobs: readonly KitchenPrintJob[],
  eligiblePendingOrderIds: ReadonlySet<string>,
  now = Date.now(),
): KitchenPrintIssue | null {
  const relevant = jobs.filter(j => {
    const created = Date.parse(j.created_at);
    if (!Number.isFinite(created) || created > now || now - created > PRINT_HEALTH_LOOKBACK_MS) return false;
    if (j.status === "failed") return true;
    if (!eligiblePendingOrderIds.has(j.order_uuid)) return false;
    const updated = Date.parse(j.updated_at);
    if (!Number.isFinite(updated)) return false;
    return (j.status === "pending" || j.status === "printing")
      && now - updated >= KITCHEN_PRINT_DELAY_MS;
  });
  if (!relevant.length) return null;
  const failed = relevant.filter(j => j.status === "failed");
  const category = failed.length ? failed : relevant;
  const key = category.map(j => j.id).sort().join(":");
  return failed.length
    ? {
      id: "failed:" + key, kind: "failed", count: failed.length,
      message: failed.length === 1
        ? "Uma comanda apresentou falha de impressão. Confira a impressora e o pedido no painel."
        : `${failed.length} comandas apresentaram falha de impressão. Verifique a impressora.`,
    }
    : {
      id: "delayed:" + key, kind: "delayed", count: relevant.length,
      message: relevant.length === 1
        ? "Uma comanda está aguardando impressão há mais de 2 minutos. Confira impressora, autorização QZ e estoque."
        : `${relevant.length} comandas aguardam impressão há mais de 2 minutos. Confira impressora, QZ e estoque.`,
    };
}

/**
 * Consulta read-only já permitida apenas a usuários autenticados pelo RLS.
 * Não abre trabalho, não reimprime, não altera pedidos, fila ou pagamento.
 */
export async function loadKitchenPrintIssue(
  client: SupabaseClient,
  queueCutoff: string | null,
  eligiblePendingOrderIds: ReadonlySet<string>,
  now = Date.now(),
): Promise<KitchenPrintIssue | null> {
  const cutoff = new Date(Math.max(
    now - PRINT_HEALTH_LOOKBACK_MS,
    queueCutoff ? (Date.parse(queueCutoff) || 0) : 0,
  )).toISOString();
  const { data, error } = await client.from("print_jobs")
    .select("id,order_uuid,kind,status,created_at,updated_at,attempts")
    .gte("created_at", cutoff)
    .in("status", ["pending", "printing", "failed"])
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Não foi possível consultar o estado das comandas.");
  return summarizeKitchenPrintIssues((data ?? []) as KitchenPrintJob[], eligiblePendingOrderIds, now);
}
