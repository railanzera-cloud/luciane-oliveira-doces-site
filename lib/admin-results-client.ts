import type { SupabaseClient } from "@supabase/supabase-js";
import { parseResultsOverview, type ResultsOverview, type ResultsPeriod } from "@/lib/admin-results-model";

// RPC exige login e devolve apenas agregados; não lê pedidos individualmente no navegador.
export async function loadAdminResults(
  client: SupabaseClient,
  period: ResultsPeriod,
): Promise<ResultsOverview> {
  const { data, error } = await client.rpc("admin_get_results_overview_v2", { p_days: period });
  if (error) {
    if (/JWT|authentication_required|permission denied/i.test(error.message ?? "")) {
      throw new Error("Sua sessão expirou ou não tem permissão para ver os resultados.");
    }
    throw new Error("Não foi possível carregar os resultados. Tente novamente.");
  }
  return parseResultsOverview(data);
}
