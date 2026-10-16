import type { SupabaseClient } from "@supabase/supabase-js";
import { parseResultsOverview, type ResultsOverview } from "@/lib/admin-results-model";
import { resultsRangeError, type ResultsRange } from "@/lib/admin-results-dates";

// RPC exige login e devolve apenas agregados; não lê pedidos individualmente no navegador.
export async function loadAdminResults(
  client: SupabaseClient,
  range: ResultsRange,
): Promise<ResultsOverview> {
  const problem = resultsRangeError(range);
  if (problem) throw new Error(problem);
  const { data, error } = await client.rpc("admin_get_results_overview_v3", {
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) {
    if (/JWT|authentication_required|permission denied/i.test(error.message ?? "")) {
      throw new Error("Sua sessão expirou ou não tem permissão para ver os resultados.");
    }
    if (/PGRST202|Could not find the function/i.test(error.message ?? "")) {
      throw new Error("O filtro de datas ainda precisa ser ativado no banco de dados.");
    }
    throw new Error("Não foi possível carregar os resultados. Tente novamente.");
  }
  const overview = parseResultsOverview(data);
  if (overview.period_start !== range.startDate || overview.period_end !== range.endDate) {
    throw new Error("O período retornado não corresponde às datas escolhidas. Atualize o relatório.");
  }
  return overview;
}
