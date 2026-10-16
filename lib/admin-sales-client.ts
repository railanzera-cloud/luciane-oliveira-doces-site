import type { SupabaseClient } from "@supabase/supabase-js";
import { resultsRangeError, type ResultsRange } from "@/lib/admin-results-dates";
import { parseAdminSalesSummary, type AdminSalesSummary } from "@/lib/admin-sales-model";

// Somente leitura de agregados e autenticação existente do painel.
export async function loadAdminSalesSummary(
  client: SupabaseClient, range: ResultsRange,
): Promise<AdminSalesSummary> {
  const problem = resultsRangeError(range);
  if (problem) throw new Error(problem);
  const { data, error } = await client.rpc("admin_get_sales_summary_v1", {
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) {
    if (/JWT|authentication_required|permission denied/i.test(error.message ?? "")) {
      throw new Error("Sua sessão expirou ou não tem permissão para ver os resultados.");
    }
    if (/PGRST202|Could not find the function/i.test(error.message ?? "")) {
      throw new Error("A consulta de vendas ainda precisa ser ativada no banco de dados.");
    }
    throw new Error("Não foi possível carregar o resumo de vendas. Tente novamente.");
  }
  return parseAdminSalesSummary(data, range);
}
