/**
 * Matriz comercial preparada em 01/11/2026.
 *
 * NAO esta conectada ao checkout nem ativa para vendas. A publicacao depende
 * de migracao aditiva do estoque, contratos de backend, disponibilidade e testes.
 * Valores em centavos. Os IDs legados sao imutaveis para pedidos historicos.
 */
export const TRUFADAS_RELEASE_ENABLED = false;
export const TRUFADAS_SIZES = Object.freeze(["p", "m", "g"]);

function size(id, priceCents, itemKey) {
  return Object.freeze({
    id,
    label: `Pacote ${id.toUpperCase()}`,
    priceCents,
    itemKey,
  });
}

export const TRUFADAS_VARIANTS = Object.freeze({
  "crocante-ninho": Object.freeze({
    productId: "crocante-ninho",
    name: "Ninho",
    sizes: Object.freeze({
      p: size("p", 1590, "trufada_ninho_p"),
      m: size("m", 1890, "trufada_ninho_m"),
      g: size("g", 2090, "trufada_ninho_g"),
    }),
  }),
  "trufada-pacoca": Object.freeze({
    productId: "trufada-pacoca",
    name: "Paçoca",
    sizes: Object.freeze({
      p: size("p", 1490, "trufada_pacoca_p"),
      m: size("m", 1690, "trufada_pacoca_m"),
      g: size("g", 1890, "trufada_pacoca_g"),
    }),
  }),
  "trufada-coco-queimado": Object.freeze({
    productId: "trufada-coco-queimado",
    name: "Coco Queimado",
    sizes: Object.freeze({
      p: size("p", 1490, "trufada_coco_queimado_p"),
      m: size("m", 1690, "trufada_coco_queimado_m"),
      g: size("g", 1890, "trufada_coco_queimado_g"),
    }),
  }),
});

/** Produtos antigos permanecem historicos: nao reaproveitar chaves ou variantes. */
export const TRUFADAS_LEGACY = Object.freeze({
  "crocante-ninho": Object.freeze({
    variantId: "400ml", itemKey: "crocante_copo_ninho",
  }),
  "crocante-chocolate": Object.freeze({
    variantId: "400ml", itemKey: "crocante_copo_chocolate",
    retiredFromNewSales: true,
  }),
});

export function getTrufadaVariant(productId, sizeId) {
  const product = Object.hasOwn(TRUFADAS_VARIANTS, productId)
    ? TRUFADAS_VARIANTS[productId] : null;
  return product && Object.hasOwn(product.sizes, sizeId)
    ? product.sizes[sizeId] : null;
}

export const TRUFADAS_ACTIVE_ITEM_KEYS = Object.freeze(
  Object.values(TRUFADAS_VARIANTS).flatMap((product) =>
    TRUFADAS_SIZES.map((sizeId) => product.sizes[sizeId].itemKey)),
);
