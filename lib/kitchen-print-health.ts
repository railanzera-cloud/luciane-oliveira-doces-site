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

export type KitchenPrintIssueJob = {
  id: string;
  order_uuid: string;
  status: "pending" | "printing" | "failed";
  attempts: number;
  created_at: string;
  updated_at: string;
  ageMinutes: number;
};

export type KitchenPrintIssue = {
  id: string;
  kind: "failed" | "delayed";
  count: number;
  message: string;
  /** Trabalhos concretos que justificam o alarme, sem assumir que o papel saiu. */
  jobs: KitchenPrintIssueJob[];
};

export type StalledKitchenPrintJob = {
  id: string;
  order_uuid: string;
  kind: string;
  status: "printing";
  claimed_at: string;
  updated_at: string;
  attempts: number;
};

/**
 * Leitura independente do alerta sonoro: exibe a comanda presa mesmo se a
 * fila estiver temporariamente pausada. Nenhuma recuperação automática.
 */
export async function loadStalledKitchenPrintJobs(
  client: SupabaseClient, now = Date.now(),
): Promise<StalledKitchenPrintJob[]> {
  const { data, error } = await client.from("print_jobs")
    .select("id,order_uuid,kind,status,claimed_at,updated_at,attempts")
    .eq("status", "printing")
    .gte("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .lte("claimed_at", new Date(now - 5 * 60 * 1000).toISOString())
    .order("claimed_at", { ascending: false }).limit(25);
  if (error) throw new Error("Não foi possível conferir as comandas travadas.");
  return (data ?? []).filter(job =>
    job.status === "printing" && typeof job.claimed_at === "string"
  ) as StalledKitchenPrintJob[];
}

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
  const details: KitchenPrintIssueJob[] = category
    .filter((job): job is KitchenPrintJob & { status: "pending" | "printing" | "failed" } =>
      job.status === "pending" || job.status === "printing" || job.status === "failed")
    .map(job => ({
      id: job.id,
      order_uuid: job.order_uuid,
      status: job.status,
      attempts: job.attempts,
      created_at: job.created_at,
      updated_at: job.updated_at,
      ageMinutes: Math.max(0, Math.floor((now - Date.parse(job.status === "pending" ? job.created_at : job.updated_at)) / 60000)),
    }))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(0, 8);
  return failed.length
    ? {
      id: "failed:" + key, kind: "failed", count: failed.length, jobs: details,
      message: failed.length === 1
        ? "Uma comanda apresentou falha de impressão. Confira a impressora e o pedido no painel."
        : `${failed.length} comandas apresentaram falha de impressão. Verifique a impressora.`,
    }
    : {
      id: "delayed:" + key, kind: "delayed", count: relevant.length, jobs: details,
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
