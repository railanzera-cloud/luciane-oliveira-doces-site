/** A etapa comercial depende da loja e do estoque remoto, jamais do calendário. */
export type LimitedCupPhase = "available" | "closed" | "unavailable" | "sold-out";
export function getLimitedCupPhase(ordersOpen: boolean, anyCupAvailable: boolean, allCupsSoldOut: boolean): LimitedCupPhase {
  if (!ordersOpen) return "closed";
  if (anyCupAvailable) return "available";
  return allCupsSoldOut ? "sold-out" : "unavailable";
}
