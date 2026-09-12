import type { SupabaseClient } from "@supabase/supabase-js";

import type { PublicOrderStatus, SitePaymentMethod } from "@/lib/site-order";
import { getSupabasePublicConfiguration } from "@/lib/supabase-config";

export type AdminOrderItem = {
  id: string;
  name: string;
  size_label: string | null;
  option_names: string[];
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

export type AdminOrder = {
  id: string;
  order_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment_type: "delivery" | "pickup";
  delivery_zone_id: string | null;
  neighborhood: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  reference: string | null;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  currency: "BRL";
  payment_method: SitePaymentMethod;
  payment_status: PublicOrderStatus["payment_status"];
  order_status: PublicOrderStatus["order_status"];
  cash_change_for: number | string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  completed_at: string | null;
  order_items: AdminOrderItem[];
};

const ORDER_COLUMNS = `
  id, order_id, order_number, customer_name, customer_phone, customer_email,
  fulfillment_type, delivery_zone_id, neighborhood, street, street_number,
  complement, reference, subtotal, delivery_fee, total, currency,
  payment_method, payment_status, order_status, cash_change_for,
  created_at, updated_at, paid_at, completed_at,
  order_items ( id, name, size_label, option_names, quantity, unit_price, line_total )
`;

function message(error: { message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (/invalid_order_transition/.test(error.message ?? "")) return "Esta mudança de situação não é permitida.";
  if (/online_payment_not_paid/.test(error.message ?? "")) return "O pagamento online ainda não foi aprovado.";
  if (/payment_not_confirmable_manually/.test(error.message ?? "")) return "Este pagamento só pode ser confirmado pelo Mercado Pago.";
  if (/cancelled_order/.test(error.message ?? "")) return "Um pedido cancelado não pode receber pagamento.";
  if (/authentication_required|JWT/i.test(error.message ?? "")) return "Sua sessão expirou. Entre novamente.";
  return error.message || fallback;
}

export async function loadAdminOrders(client: SupabaseClient): Promise<AdminOrder[]> {
  const { data, error } = await client.from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(message(error, "Não foi possível carregar os pedidos."));
  return (data ?? []) as unknown as AdminOrder[];
}

export async function transitionAdminOrder(
  client: SupabaseClient,
  orderId: string,
  status: PublicOrderStatus["order_status"],
): Promise<void> {
  const { error } = await client.rpc("admin_transition_order", { p_order_uuid: orderId, p_new_status: status });
  if (error) throw new Error(message(error, "Não foi possível atualizar o pedido."));
}

export async function confirmOfflinePayment(client: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await client.rpc("admin_confirm_offline_payment", { p_order_uuid: orderId });
  if (error) throw new Error(message(error, "Não foi possível confirmar o pagamento."));
}

export async function requestOrderEffects(accessToken: string): Promise<void> {
  const { url, publishableKey } = getSupabasePublicConfiguration();
  if (!url || !publishableKey) return;
  const response = await fetch(`${url}/functions/v1/process-order-effects`, {
    method: "POST",
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok && response.status !== 503) throw new Error("O evento da Meta ficou na fila para nova tentativa.");
}

export async function createReprint(client: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await client.rpc("admin_create_reprint", { p_order_uuid: orderId });
  if (error) throw new Error(message(error, "Não foi possível criar a reimpressão."));
}

export type PrintClaim = {
  job: { id: string; claim_token: string; kind: "initial" | "reprint"; attempts: number };
  order: Omit<AdminOrder, "order_items">;
  items: AdminOrderItem[];
};

export async function claimPrintJob(client: SupabaseClient, workerId: string): Promise<PrintClaim | null> {
  const { data, error } = await client.rpc("claim_print_job", { p_worker_id: workerId });
  if (error) throw new Error(message(error, "Não foi possível consultar a fila de impressão."));
  return data as PrintClaim | null;
}

export async function completePrintJob(client: SupabaseClient, claim: PrintClaim): Promise<void> {
  const { error } = await client.rpc("complete_print_job", {
    p_job_id: claim.job.id,
    p_claim_token: claim.job.claim_token,
  });
  if (error) throw new Error(message(error, "Não foi possível confirmar a impressão."));
}

export async function failPrintJob(client: SupabaseClient, claim: PrintClaim, failure: string): Promise<void> {
  const { error } = await client.rpc("fail_print_job", {
    p_job_id: claim.job.id,
    p_claim_token: claim.job.claim_token,
    p_error: failure.slice(0, 500),
  });
  if (error) throw new Error(message(error, "Não foi possível registrar a falha de impressão."));
}
