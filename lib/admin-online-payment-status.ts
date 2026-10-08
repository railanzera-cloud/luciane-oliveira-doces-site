import type { PublicOrderStatus, SitePaymentMethod } from "@/lib/site-order";

type OnlineMethod = Extract<SitePaymentMethod, "mercado_pago_pix" | "mercado_pago_card">;
type PaymentStatus = PublicOrderStatus["payment_status"];

// These labels only present already-recorded financial states. They never change an order.
export function onlinePaymentLabel(
  method: OnlineMethod,
  paymentStatus: PaymentStatus,
  gatewayStatusDetail: string | null | undefined,
): string {
  const methodLabel = method === "mercado_pago_pix" ? "Pix online" : "Cartão online";
  switch (paymentStatus) {
    case "paid": return `Pago — ${methodLabel}`;
    case "cancelled": return `${methodLabel} ${gatewayStatusDetail === "expired" ? "expirado" : "cancelado"}`;
    case "failed": return `${methodLabel} recusado`;
    case "refunded": return `${methodLabel} reembolsado`;
    default: return `${methodLabel} pendente`;
  }
}

// A financially canceled/failed attempt can coexist with payment_pending,
// because the operational order may still permit a new payment attempt.
export function pendingOnlineOrderLabel(
  paymentStatus: PaymentStatus,
  gatewayStatusDetail: string | null | undefined,
): string | null {
  switch (paymentStatus) {
    case "cancelled": return gatewayStatusDetail === "expired" ? "Pagamento expirado" : "Pagamento cancelado";
    case "failed": return "Pagamento recusado";
    case "refunded": return "Pagamento reembolsado";
    default: return null;
  }
}
