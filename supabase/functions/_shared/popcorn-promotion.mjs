// Paragominas, America/Belem (UTC-03). End is exclusive: Monday at 00:00.
export const POPCORN_PROMOTION = Object.freeze({
  startsAt: Date.parse('2026-10-10T00:00:00-03:00'),
  endsAt: Date.parse('2026-10-12T00:00:00-03:00'),
  pricesCents: Object.freeze({ '500ml': 2500, '750ml': 3900, '1l': 4900 }),
});

export function isPopcornPromotionActive(now = Date.now()) {
  return now >= POPCORN_PROMOTION.startsAt && now < POPCORN_PROMOTION.endsAt;
}

export function promotionalPopcornPriceCents(size, regularPriceCents, now = Date.now()) {
  return Object.hasOwn(POPCORN_PROMOTION.pricesCents, size) && isPopcornPromotionActive(now)
    ? POPCORN_PROMOTION.pricesCents[size] : regularPriceCents;
}
