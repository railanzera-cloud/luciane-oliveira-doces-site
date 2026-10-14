/**
 * Campanha da edição crocante: calendário só altera a comunicação.
 * NÃO ativa produtos, estoque, carrinho ou checkout.
 * A venda só poderá ser anunciada quando o fluxo dos dois copos estiver
 * integrado e o estoque for confirmado pela loja.
 */
export type LimitedCupPhase = "prelaunch" | "awaiting-release" | "available" | "sold-out";

export const LIMITED_CUP_RELEASE = {
  // Abertura às 12h de 15/10 no horário de Paragominas (UTC-3), validada também no backend.
  launchDayStart: "2026-10-15T12:00:00-03:00",
  orderingIntegrated: true,
  salesApprovedByStore: true,
  inventoryVerifiedAvailable: true,
  soldOutConfirmed: false,
} as const;

export function resolveLimitedCupPhase(
  nowMs: number,
  cfg: {
    launchDayStart: string;
    orderingIntegrated: boolean;
    salesApprovedByStore: boolean;
    inventoryVerifiedAvailable: boolean;
    soldOutConfirmed: boolean;
  },
): LimitedCupPhase {
  if (cfg.soldOutConfirmed) return "sold-out";
  if (nowMs < Date.parse(cfg.launchDayStart)) return "prelaunch";
  if (cfg.orderingIntegrated && cfg.salesApprovedByStore && cfg.inventoryVerifiedAvailable) return "available";
  return "awaiting-release";
}

export function getLimitedCupPhase(nowMs: number): LimitedCupPhase {
  return resolveLimitedCupPhase(nowMs, LIMITED_CUP_RELEASE);
}
