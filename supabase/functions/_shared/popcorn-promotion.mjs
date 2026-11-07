// Sábado Gourmet 07/11/2026 (America/Belem, UTC-03).
// Desconto somente para sabores que NÃO incluem Nutella. Em qualquer combinação
// com Nutella vale o grupo de preço normal mais alto. Expira 08/11 00:00.
export const POPCORN_PROMOTION = Object.freeze({
  id: "gourmet-sabado-20261107-exceto-nutella",
  startsAt: Date.parse("2026-11-07T00:00:00-03:00"),
  endsAt: Date.parse("2026-11-08T00:00:00-03:00"),
  pricesCents: Object.freeze({ "500ml": 2500, "750ml": 3900, "1l": 4900 }),
  excludedFlavorIds: Object.freeze(["nutella"]),
});
export function isPopcornPromotionActive(now = Date.now()) {
  return Number.isFinite(now) && now >= POPCORN_PROMOTION.startsAt && now < POPCORN_PROMOTION.endsAt;
}
export function isPopcornPromotionEligible(optionIds = []) {
  return Array.isArray(optionIds) && !optionIds.some(id => POPCORN_PROMOTION.excludedFlavorIds.includes(id));
}
export function promotionalPopcornPriceCents(size, regularPriceCents, now = Date.now(), optionIds = []) {
  return Object.hasOwn(POPCORN_PROMOTION.pricesCents, size)
    && isPopcornPromotionActive(now) && isPopcornPromotionEligible(optionIds)
    ? POPCORN_PROMOTION.pricesCents[size] : regularPriceCents;
}
