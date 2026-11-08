/**
 * Apenas a ORDEM DE APRESENTAÇÃO de complementos no pós-adição.
 * Não altera preço, estoque, carrinho, status de pagamento nem cria pedidos.
 * Disponibilidade vem dos mesmos estados comerciais já usados pelo checkout.
 */
const PRIORITIES = Object.freeze({
  gourmet: ["cones", "trufadas", "fatias", "gourmet"],
  trufadas: ["cones", "gourmet", "fatias", "trufadas"],
  fatias: ["cones", "gourmet", "trufadas", "fatias"],
  cones: ["cones", "trufadas", "fatias", "gourmet"],
});

/** @param {"gourmet"|"trufadas"|"fatias"|"cones"} origin */
export function orderCheckoutComplements(origin, available) {
  const order = PRIORITIES[origin] ?? PRIORITIES.gourmet;
  const active = order.filter((id) => available[id] === true);
  if (available.bebidas === true) active.push("bebidas");
  return active;
}
