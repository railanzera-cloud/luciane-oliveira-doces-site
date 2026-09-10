// Dados locais do pedido. Não confirma envio, pagamento ou venda.
export type OrderAttribution = {
  landing_url: string;
  last_url: string;
  parameters: Record<string, string[]>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  tintim_fbid?: string;
  origem?: string;
};

export type OrderContext = {
  order_id: string;
  created_at: string;
  attribution: OrderAttribution;
  whatsapp_attempted_at?: string;
  handoff_fingerprint?: string;
};

export type CheckoutDetails = {
  items: Array<{
    product_id: string;
    variant_id: string;
    option_ids: string[];
    name: string;
    size: string;
    kind: string;
    options: string[];
    quantity: number;
    unit_price: number;
  }>;
  fulfillment: "entrega" | "retirada" | "";
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  reference: string;
  payment: "pix" | "dinheiro" | "cartao" | "";
  needs_change: boolean;
  cash_received_cents: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: "BRL";
};

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "fbp", "fbc", "tintim_fbid", "origem"] as const;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function cleanWhatsAppText(value: string): string {
  return value.normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\p{Cf}/gu, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u00A0\u202F\t]/g, " ")
    .split("\n").map((line) => line.replace(/ +/g, " ").trim()).join("\n")
    .trim();
}

export function cleanWhatsAppField(value: string): string {
  return cleanWhatsAppText(value).replace(/\n+/g, " ").replace(/[*_~`]/g, "").trim();
}

export function formatOrderMoney(value: number): string {
  return cleanWhatsAppText(money.format(value));
}

// Aceita 50, 50,00, R$ 50,00, 1.000,00 e 50.00; rejeita negativos e texto parcial.
export function parseCashCents(value: string): number | null {
  let normalized = cleanWhatsAppField(value).replace(/^R\$\s*/i, "").trim();
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimals = ""] = normalized.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function createOrderId(): string {
  // 60 bits aleatórios, sem contador compartilhado ou caracteres ambíguos.
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const code = Array.from(bytes, (byte) => alphabet[byte & 31]).join("");
  return `LOD-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

export function captureOrderAttribution(href: string, cookies: string, previous?: OrderAttribution): OrderAttribution {
  const url = new URL(href);
  const parameters: Record<string, string[]> = Object.create(null);
  if (previous?.parameters) {
    for (const [key, values] of Object.entries(previous.parameters)) {
      if (Array.isArray(values) && values.every((value) => typeof value === "string")) parameters[key] = [...values];
    }
  }
  for (const key of new Set(url.searchParams.keys())) parameters[key] = url.searchParams.getAll(key);
  const result: OrderAttribution = {
    landing_url: previous?.landing_url || href,
    last_url: href,
    parameters,
  };
  for (const key of attributionKeys) {
    const value = url.searchParams.get(key) || previous?.[key];
    if (typeof value === "string" && value) result[key] = value;
  }
  for (const [field, cookieName] of [["fbp", "_fbp"], ["fbc", "_fbc"]] as const) {
    const cookie = cookies.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${cookieName}=`));
    if (cookie) {
      const raw = cookie.slice(cookieName.length + 1);
      try { result[field] = decodeURIComponent(raw); } catch { result[field] = raw; }
    }
  }
  return result;
}

export function newOrderContext(attribution: OrderAttribution): OrderContext {
  return { order_id: createOrderId(), created_at: new Date().toISOString(), attribution };
}

export function restoreOrderContext(value: unknown, attribution: OrderAttribution): OrderContext {
  const saved = value && typeof value === "object" ? value as Partial<OrderContext> : null;
  if (!saved || typeof saved.order_id !== "string" || !/^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/.test(saved.order_id)) {
    return newOrderContext(attribution);
  }
  return {
    order_id: saved.order_id,
    created_at: typeof saved.created_at === "string" ? saved.created_at : new Date().toISOString(),
    attribution,
    ...(typeof saved.whatsapp_attempted_at === "string" ? { whatsapp_attempted_at: saved.whatsapp_attempted_at } : {}),
    ...(typeof saved.handoff_fingerprint === "string" ? { handoff_fingerprint: saved.handoff_fingerprint } : {}),
  };
}

export function paymentDescription(payment: CheckoutDetails["payment"], fulfillment: CheckoutDetails["fulfillment"]): string {
  if (payment === "pix") return "Pix";
  if (payment === "dinheiro") return "Dinheiro";
  if (payment === "cartao") return fulfillment === "retirada" ? "Cartão na retirada" : fulfillment === "entrega" ? "Cartão na entrega" : "Cartão";
  return "Escolher opção";
}

export function buildOrderMessage(order: CheckoutDetails, orderId: string, pix: { holder: string; key: string; keyType: string }): string {
  const itemLines = order.items.map((item, index) => {
    const quantity = item.kind === "slice" ? `${item.quantity} ${item.quantity === 1 ? "fatia" : "fatias"}` : `${item.quantity} un.`;
    const title = item.kind === "slice" ? item.name : `${item.name} ${item.size}`;
    return [`*${index + 1}. ${title} — ${quantity}*`,
      ...(item.options.length ? [`Sabores: ${item.options.join(" + ")}`] : []),
      formatOrderMoney(item.unit_price * item.quantity)].join("\n");
  }).join("\n\n");
  const receiving = order.fulfillment === "retirada" ? ["Retirada", "Cidade: Paragominas"] : [
    "Entrega", `Bairro: ${cleanWhatsAppField(order.neighborhood)}`, `Rua: ${cleanWhatsAppField(order.street)}`,
    `Número: ${cleanWhatsAppField(order.number)}`,
    ...(order.complement.trim() ? [`Complemento: ${cleanWhatsAppField(order.complement)}`] : []),
    ...(order.reference.trim() ? [`Referência: ${cleanWhatsAppField(order.reference)}`] : []),
  ];
  const paymentLines = [paymentDescription(order.payment, order.fulfillment)];
  if (order.payment === "dinheiro") {
    if (order.needs_change) {
      const totalCents = Math.round(order.total * 100);
      if (order.cash_received_cents === null || order.cash_received_cents < totalCents) throw new Error("Corrija o valor para troco antes de continuar.");
      paymentLines.push(`Troco para: ${formatOrderMoney(order.cash_received_cents / 100)}`,
        `Troco necessário: ${formatOrderMoney((order.cash_received_cents - totalCents) / 100)}`);
    } else paymentLines.push("Não precisa de troco.");
  }
  const total = formatOrderMoney(order.total);
  const nextStep = order.payment === "pix" ? [
    "*PRÓXIMO PASSO — PAGAMENTO PIX*", "", `Valor a pagar: *${total}*`, "",
    `*Chave Pix (${pix.keyType})*`, pix.key, "", `Titular: ${pix.holder}`, "",
    "Faça o pagamento e envie o comprovante nesta conversa.",
  ].join("\n") : order.payment === "cartao"
    ? order.fulfillment === "retirada"
      ? "O pagamento será realizado no cartão no momento da retirada.\n\nAguarde a confirmação do pedido antes de se deslocar."
      : "O pagamento será realizado no cartão no momento da entrega."
    : `O pagamento será realizado em dinheiro no momento da ${order.fulfillment === "retirada" ? "retirada" : "entrega"}.`;

  return cleanWhatsAppText([
    "Olá! Finalizei meu pedido pelo cardápio da *Luciane Oliveira Doces*.", "",
    `*PEDIDO ${orderId}*`, "", itemLines, "", "*RECEBIMENTO*", receiving.join("\n"), "",
    "*PAGAMENTO*", paymentLines.join("\n"), "", "*RESUMO*",
    `Produtos: ${formatOrderMoney(order.subtotal)}`,
    `Taxa de entrega: ${order.fulfillment === "entrega" ? formatOrderMoney(order.delivery_fee) : "não se aplica"}`,
    `*Total: ${total}*`, "", nextStep,
  ].join("\n"));
}
