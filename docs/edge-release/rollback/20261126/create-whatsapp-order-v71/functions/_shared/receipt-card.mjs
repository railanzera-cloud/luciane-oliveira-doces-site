// Presencial only. Basis points and integer arithmetic; no gateway integration.
export const RECEIPT_CARD_RATES = Object.freeze({ credit_single: 305, debit: 57 });
/** @param {number} baseCents @param {"credit_single" | "debit" | null} mode */
export function receiptCardQuote(baseCents, mode = null) {
  if (!Number.isSafeInteger(baseCents) || baseCents < 0) throw new Error('Total base inválido.');
  if (mode !== null && !Object.hasOwn(RECEIPT_CARD_RATES, mode)) throw new Error('Modalidade de cartão inválida.');
  const basisPoints = mode === null ? 0 : RECEIPT_CARD_RATES[mode];
  const base = BigInt(baseCents), denominator = 10000n - BigInt(basisPoints);
  const total = (base * 10000n + denominator - 1n) / denominator;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Total excede o limite.');
  return { baseCents, basisPoints, feeCents: Number(total - base), totalCents: Number(total) };
}
export function receiptCardLabel(mode) { return mode === 'credit_single' ? 'Crédito à vista (1x)' : mode === 'debit' ? 'Débito' : 'Cartão no recebimento'; }
