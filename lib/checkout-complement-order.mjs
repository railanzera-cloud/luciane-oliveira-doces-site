/**
 * Apenas a ORDEM DE APRESENTAÇÃO de complementos no pós-adição.
 * Não altera preço, estoque, carrinho, status de pagamento nem cria pedidos.
 * Disponibilidade vem dos mesmos estados comerciais já usados pelo checkout.
 */
const PRIORITIES = Object.freeze({
  gourmet: ["trufadas", "fatias", "gourmet"],
  trufadas: ["gourmet", "fatias", "trufadas"],
  fatias: ["gourmet", "trufadas", "fatias"],
});

/** @param {"gourmet"|"trufadas"|"fatias"} origin */
export function orderCheckoutComplements(origin, available) {
  const order = PRIORITIES[origin] ?? PRIORITIES.gourmet;
  const active = order.filter((id) => available[id] === true);
  if (available.bebidas === true) active.push("bebidas");
  return active;
}
