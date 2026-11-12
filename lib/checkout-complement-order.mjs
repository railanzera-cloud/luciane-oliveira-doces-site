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
  natal: ["cones", "trufadas", "fatias", "gourmet"],
});

/** @param {"gourmet"|"trufadas"|"fatias"|"cones"|"natal"} origin */
export function orderCheckoutComplements(origin, available) {
  const order = PRIORITIES[origin] ?? PRIORITIES.gourmet;
  // Preservar a própria categoria para que o cliente possa repetir o configurador.
  // Natal é uma categoria extra, não um substituto da categoria de origem.
  // Cada categoria realmente disponível aparece uma vez, sem corte arbitrário em 4.
  const validOrigin = Object.hasOwn(PRIORITIES, origin) ? origin : "gourmet";
  const suggestions = available.natal === true
    ? [validOrigin, ...(validOrigin === "natal" ? [] : ["natal"]), ...order.filter((id) => id !== validOrigin)]
    : order;
  const active = suggestions.filter((id) => available[id] === true);
  if (available.bebidas === true) active.push("bebidas");
  return active;
}
