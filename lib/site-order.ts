import { getSupabasePublicConfiguration } from "@/lib/supabase-config";

export type SitePaymentMethod =
  | "mercado_pago_pix"
  | "mercado_pago_card"
  | "card_on_delivery"
  | "cash";

export type MercadoPagoCardData = {
  token: string;
  payment_method_id: string;
  payment_type_id: "credit_card" | "debit_card";
  installments: number;
  identification?: { type: string; number: string };
  payer_email?: string;
};

export type PublicOrderStatus = {
  order_number: number;
  payment_method: SitePaymentMethod;
  payment_status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  order_status: "payment_pending" | "new" | "confirmed" | "preparing" | "ready" | "ready_for_pickup" | "out_for_delivery" | "completed" | "cancelled";
  fulfillment_type: "delivery" | "pickup";
  total: number | string;
  currency: "BRL";
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
  payment?: SitePaymentGatewayResponse;
};

export type SitePaymentGatewayResponse = {
  id?: string | null;
  status?: string | null;
  status_detail?: string | null;
  total_amount?: string | null;
  payment?: {
    id?: string | null;
    status?: string | null;
    status_detail?: string | null;
    ticket_url?: string | null;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    expires_at?: string | null;
    challenge_url?: string | null;
  };
};

export type SiteOrderResult = {
  order: {
    id: string;
    order_id: string;
    order_number: number;
    tracking_token: string;
    payment_status: PublicOrderStatus["payment_status"];
    order_status: PublicOrderStatus["order_status"];
    total: number | string;
    currency: "BRL";
    idempotent?: boolean;
  };
  payment: SitePaymentGatewayResponse & {
    method?: SitePaymentMethod;
    payable_on_receipt?: boolean;
  };
  idempotent?: boolean;
};

export type CreateSiteOrderInput = {
  client_order_id: string;
  customer: { name: string; phone: string; email?: string };
  items: Array<{ product_id: string; variant_id: string; option_ids: string[]; quantity: number }>;
  fulfillment: {
    type: "delivery" | "pickup";
    zone_id?: string;
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
    reference?: string;
  };
  payment: {
    method: SitePaymentMethod;
    change_for?: string;
    card?: Omit<MercadoPagoCardData, "payer_email">;
  };
  attribution: Record<string, unknown>;
  new_payment_attempt?: boolean;
};

export class SiteOrderError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function edgeRequest<T>(functionName: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { url, publishableKey } = getSupabasePublicConfiguration();
  if (!url || !publishableKey) {
    throw new SiteOrderError(503, "checkout_not_configured", "A finalização pelo site ainda não está disponível.");
  }
  const response = await fetch(`${url}/functions/v1/${functionName}`, {
    method: "POST",
    signal,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || result?.ok !== true) {
    const error = result?.error && typeof result.error === "object"
      ? result.error as Record<string, unknown>
      : {};
    throw new SiteOrderError(
      response.status,
      typeof error.code === "string" ? error.code : "request_failed",
      typeof error.message === "string" ? error.message : "Não foi possível concluir a operação.",
      error.details && typeof error.details === "object" ? error.details as Record<string, unknown> : undefined,
    );
  }
  return result as T;
}

export async function createSiteOrder(input: CreateSiteOrderInput): Promise<SiteOrderResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const result = await edgeRequest<{ ok: true } & SiteOrderResult>("create-order", input, controller.signal);
    return { order: result.order, payment: result.payment, idempotent: result.idempotent };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SiteOrderError(504, "checkout_timeout", "A confirmação demorou mais que o esperado. Tente novamente sem alterar o pedido.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function loadPublicOrderStatus(trackingToken: string): Promise<PublicOrderStatus> {
  const result = await edgeRequest<{ ok: true; order: PublicOrderStatus }>("public-order-status", {
    tracking_token: trackingToken,
  });
  return result.order;
}

export function sitePaymentLabel(method: SitePaymentMethod, fulfillment: "entrega" | "retirada" | ""): string {
  if (method === "mercado_pago_pix") return "Pix online";
  if (method === "mercado_pago_card") return "Cartão online";
  if (method === "card_on_delivery") return fulfillment === "retirada" ? "Cartão na retirada" : "Cartão na entrega";
  return fulfillment === "retirada" ? "Dinheiro na retirada" : "Dinheiro na entrega";
}

export function isGatewayPaid(payment: SitePaymentGatewayResponse): boolean {
  return payment.status === "processed" && payment.status_detail === "accredited";
}

export function isGatewayFailed(payment: SitePaymentGatewayResponse): boolean {
  return ["failed", "cancelled", "canceled", "expired"].includes(payment.status ?? "");
}
