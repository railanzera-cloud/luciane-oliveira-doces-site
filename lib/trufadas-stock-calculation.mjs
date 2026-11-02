/**
 * Lógica pura do editor de Pipocas Trufadas.
 * "livres" são pacotes prontos AINDA NÃO comprometidos em pedidos.
 * O RPC exige "total" incluindo as unidades comprometidas.
 * Este módulo não confirma pagamento nem altera uma reserva.
 */

/** @param {{ total: number, reserved: number }} row */
export function freePackages(row) {
  return Math.max(0, row.total - row.reserved);
}

/**
 * @param {string} input - Pacotes livres que a operadora contou.
 * @param {number} reserved - Reserva confirmada na última consulta.
 * @returns {{free: number,total: number} | null}
 */
export function prepareTrufadasStockTotal(input, reserved) {
  if (typeof input !== "string" || !/^\d+$/.test(input.trim())) return null;
  const free = Number(input.trim());
  if (!Number.isSafeInteger(free) || !Number.isSafeInteger(reserved) || reserved < 0) return null;
  const total = free + reserved;
  if (!Number.isSafeInteger(total) || total < reserved || total > 100000) return null;
  return { free, total };
}

/**
 * @param {{version:number,reserved:number,total:number,enabled:boolean}} original
 * @param {{version:number,reserved:number,total:number,enabled:boolean}|undefined} current
 */
export function stockSnapshotChanged(original, current) {
  return !current || current.version !== original.version
    || current.reserved !== original.reserved
    || current.total !== original.total
    || current.enabled !== original.enabled;
}
