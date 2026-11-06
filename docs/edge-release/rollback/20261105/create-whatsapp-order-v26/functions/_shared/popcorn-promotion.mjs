// Edição Gourmet de Hoje — segunda-feira, 02/11/2026, feriado de Finados.
// Janela absoluta America/Belem (UTC-03); fim EXCLUSIVO na terça 03/11 00:00.
// Não alterar a tabela permanente de preços de cada grupo de recheio.
export const POPCORN_PROMOTION = Object.freeze({
  id: "gourmet-feriado-20261102",
  startsAt: Date.parse("2026-11-02T00:00:00-03:00"),
  endsAt: Date.parse("2026-11-03T00:00:00-03:00"),
  pricesCents: Object.freeze({ "500ml": 2500, "750ml": 3900, "1l": 4900 }),
});

export function isPopcornPromotionActive(now = Date.now()) {
  return Number.isFinite(now)
    && now >= POPCORN_PROMOTION.startsAt
    && now < POPCORN_PROMOTION.endsAt;
}

export function promotionalPopcornPriceCents(size, regularPriceCents, now = Date.now()) {
  return Object.hasOwn(POPCORN_PROMOTION.pricesCents, size) && isPopcornPromotionActive(now)
    ? POPCORN_PROMOTION.pricesCents[size]
    : regularPriceCents;
}
