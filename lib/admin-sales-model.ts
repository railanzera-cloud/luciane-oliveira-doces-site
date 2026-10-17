import type { ResultsRange } from "@/lib/admin-results-dates";

// Somente valores agregados: nenhum cliente, telefone ou pedido individual.
export type AdminSalesSummary = {
  period_start: string;
  period_end: string;
  generated_at: string;
  scope: "orders_registered_in_panel";
  orders_created: number;
  completed_paid_orders: number;
  completed_paid_amount: number;
  completed_unpaid_orders: number;
  completed_unpaid_amount: number;
  paid_in_progress_orders: number;
  paid_in_progress_amount: number;
  previous_completed_paid_orders: number;
  previous_completed_paid_amount: number;
};

const integers = [
  "orders_created", "completed_paid_orders", "completed_unpaid_orders",
  "paid_in_progress_orders", "previous_completed_paid_orders",
] as const;
const amounts = [
  "completed_paid_amount", "completed_unpaid_amount", "paid_in_progress_amount",
  "previous_completed_paid_amount",
] as const;

export function parseAdminSalesSummary(value: unknown, range: ResultsRange): AdminSalesSummary {
  if (typeof value !== "object" || !value || Array.isArray(value)) {
    throw new Error("O resumo de vendas veio incompleto.");
  }
  const row = value as Record<string, unknown>;
  if (row.period_start !== range.startDate || row.period_end !== range.endDate
    || row.scope !== "orders_registered_in_panel"
    || typeof row.generated_at !== "string"
    || !integers.every(key => Number.isSafeInteger(Number(row[key])) && Number(row[key]) >= 0 && row[key] !== null && row[key] !== "")
    || !amounts.every(key => row[key] !== null && row[key] !== "" && Number.isFinite(Number(row[key])) && Number(row[key]) >= 0)
    || Number(row.completed_paid_orders) + Number(row.completed_unpaid_orders) > Number(row.orders_created)
    || Number(row.paid_in_progress_orders) > Number(row.orders_created)) {
    throw new Error("Os valores do resumo de vendas não estão consistentes.");
  }
  return {
    period_start: range.startDate,
    period_end: range.endDate,
    generated_at: row.generated_at,
    scope: "orders_registered_in_panel",
    orders_created: Number(row.orders_created),
    completed_paid_orders: Number(row.completed_paid_orders),
    completed_paid_amount: Number(row.completed_paid_amount),
    completed_unpaid_orders: Number(row.completed_unpaid_orders),
    completed_unpaid_amount: Number(row.completed_unpaid_amount),
    paid_in_progress_orders: Number(row.paid_in_progress_orders),
    paid_in_progress_amount: Number(row.paid_in_progress_amount),
    previous_completed_paid_orders: Number(row.previous_completed_paid_orders),
    previous_completed_paid_amount: Number(row.previous_completed_paid_amount),
  };
}
