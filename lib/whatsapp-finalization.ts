import type { SitePaymentMethod } from "@/lib/site-order";

type CardMode = "credit_single" | "debit" | null | undefined;

export function getWhatsAppFinalizationCopy(method: SitePaymentMethod | undefined, cardMode: CardMode) {
  const intro = "Ao abrir o WhatsApp, toque em Enviar.";
  if (method === "manual_pix") {
    return { label: "Pix", instruction: `${intro} A mensagem contém a chave Pix e o valor para pagamento.` };
  }
  if (cardMode === "credit_single") {
    return { label: "Crédito à vista", instruction: `${intro} O pagamento será no cartão de crédito, no recebimento.` };
  }
  if (cardMode === "debit") {
    return { label: "Débito", instruction: `${intro} O pagamento será no cartão de débito, no recebimento.` };
  }
  if (method === "cash") {
    return { label: "Dinheiro", instruction: `${intro} O pagamento será em dinheiro, no recebimento.` };
  }
  if (method === "card_on_delivery") {
    return { label: "Cartão no recebimento", instruction: `${intro} O pagamento será no cartão, no recebimento.` };
  }
  return { label: "Pagamento escolhido", instruction: `${intro} Confira os dados do pedido e combine o pagamento com a loja.` };
}

/**
 * O link original, que contém os itens, Pix e parâmetros de atribuição, só pode
 * ser retomado na mesma sessão e para o token/número exatos. Não cria pedidos.
 * Outros dispositivos usam uma mensagem de assistência com o número já registrado.
 */
export function readStoredWhatsAppHandoff(token: string, orderNumber: number): string | null {
  if (typeof window === "undefined" || !/^[0-9a-f]{48}$/.test(token)) return null;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem("luciane-order-session-v2") || "null");
    const handoff = saved?.whatsappResult;
    if (handoff?.result?.order?.tracking_token !== token || handoff?.result?.order?.order_number !== orderNumber) return null;
    const url = new URL(handoff.whatsappUrl);
    if (url.protocol !== "https:" || url.hostname !== "tintim.link" || !url.pathname.startsWith("/whatsapp/") || !url.searchParams.has("text")) return null;
    return url.href;
  } catch {
    return null;
  }
}
