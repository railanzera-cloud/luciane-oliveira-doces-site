/**
 * Campanha real de últimas fatias, sábado 31/10/2026, em Paragominas.
 * Esta função só controla a comunicação, nunca autoriza vendas após fechamento.
 * Não anuncia contagem estática: as fatias comuns não têm saldo automático.
 */
export const LAST_SLICES_PRODUCT_IDS = ["fatia-chocolate-morango", "fatia-prestigio"] as const;

export function isLastSlicesWindow(now: Date): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Belem", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}` === "2026-10-31"
    && `${parts.hour}:${parts.minute}` < "20:00";
}
