import { promotionalPopcornPriceCents } from "./popcorn-promotion.mjs";

/**
 * Aplica a campanha ao orçamento autoritativo do checkout Site, sem confiar nos
 * valores do navegador. WhatsApp já calcula direto no catálogo compartilhado.
 * Pode ser chamado novamente sem acumular descontos.
 */
export function applyPopcornPromotionToQuote(quote, now = Date.now()) {
  if (!quote || !Array.isArray(quote.items)) throw new Error("Orçamento inválido.");
  const items = quote.items.map(item => {
    if (item.product_id !== "pipoca-gourmet") return item;
    const unit = promotionalPopcornPriceCents(item.variant_id, item.unit_price_cents, now);
    return { ...item, unit_price_cents: unit, line_total_cents: unit * item.quantity };
  });
  return {
    ...quote,
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.line_total_cents, 0),
  };
}
