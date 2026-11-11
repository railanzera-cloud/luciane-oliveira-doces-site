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
  // Quatro alternativas reais, preservando a ordem antiga quando Natal está oculto.
  // Com a coleção visível, trocar a repetição da categoria de origem pelo Natal.
  // "Adicionar mais itens"/voltar às categorias mantém o caminho para repetir o mesmo tipo.
  const suggestions = available.natal === true && origin !== "natal"
    ? ["natal", ...order.filter((id) => id !== origin)]
    : order;
  const active = suggestions.filter((id) => available[id] === true).slice(0, 4);
  if (available.bebidas === true) active.push("bebidas");
  return active;
}
