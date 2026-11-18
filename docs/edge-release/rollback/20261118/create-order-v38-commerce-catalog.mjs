// Snapshot comercial autoritativo do backend. Valores em centavos evitam ponto flutuante.
// Ao alterar o catálogo público, os testes de paridade devem ser atualizados na mesma versão.
export const CATALOG_VERSION = "2026-09-12.v1";

export const CATEGORY_ITEM_KEYS = Object.freeze({
  pipocas: "category_pipocas",
  fatias: "category_fatias",
});

export const POPCORN_SIZES = Object.freeze({
  "500ml": Object.freeze({ id: "500ml", label: "500 ml", itemKey: "popcorn_size_500ml", maxOptions: 2 }),
  "750ml": Object.freeze({ id: "750ml", label: "750 ml", itemKey: "popcorn_size_750ml", maxOptions: 2 }),
  "1l": Object.freeze({ id: "1l", label: "1 litro", itemKey: "popcorn_size_1l", maxOptions: 3 }),
});

export const POPCORN_PRICES_CENTS = Object.freeze({
  1: Object.freeze({ "500ml": 2500, "750ml": 3900, "1l": 4900 }),
  2: Object.freeze({ "500ml": 3000, "750ml": 4500, "1l": 5500 }),
  3: Object.freeze({ "500ml": 3300, "750ml": 4800, "1l": 5800 }),
});

export const POPCORN_FLAVORS = Object.freeze({
  leitinho: Object.freeze({ id: "leitinho", itemKey: "popcorn_flavor_leitinho", name: "Leitinho", pricingGroup: 1 }),
  "choco-nute": Object.freeze({ id: "choco-nute", itemKey: "popcorn_flavor_choco_nute", name: "Choco Nute", pricingGroup: 1 }),
  ovomaltine: Object.freeze({ id: "ovomaltine", itemKey: "popcorn_flavor_ovomaltine", name: "Ovomaltine", pricingGroup: 1 }),
  "kinder-bueno": Object.freeze({ id: "kinder-bueno", itemKey: "popcorn_flavor_kinder_bueno", name: "Kinder Bueno", pricingGroup: 2 }),
  "choco-cookies-branco": Object.freeze({ id: "choco-cookies-branco", itemKey: "popcorn_flavor_choco_cookies_branco", name: "Choco Cookies Branco", pricingGroup: 2 }),
  "choco-cookies-leite": Object.freeze({ id: "choco-cookies-leite", itemKey: "popcorn_flavor_choco_cookies_leite", name: "Choco Cookies ao Leite", pricingGroup: 2 }),
  "kinder-bueno-crisp": Object.freeze({ id: "kinder-bueno-crisp", itemKey: "popcorn_flavor_kinder_bueno_crisp", name: "Crispy Bueno", pricingGroup: 3 }),
  nutella: Object.freeze({ id: "nutella", itemKey: "popcorn_flavor_nutella", name: "Nutella", pricingGroup: 3 }),
});

export const SLICES = Object.freeze({
  "fatia-chocolate-morango": Object.freeze({ id: "fatia-chocolate-morango", itemKey: "slice_chocolate_morango", name: "Chocolate com Morango", priceCents: 2200 }),
  "fatia-ninho-morango": Object.freeze({ id: "fatia-ninho-morango", itemKey: "slice_ninho_morango", name: "Ninho com Morango", subtitle: "Massa branca", priceCents: 2200 }),
  "fatia-prestigio": Object.freeze({ id: "fatia-prestigio", itemKey: "slice_prestigio", name: "Prestígio", priceCents: 2000 }),
  "fatia-chocolate-maracuja": Object.freeze({ id: "fatia-chocolate-maracuja", itemKey: "slice_chocolate_maracuja", name: "Chocolate com Maracujá", priceCents: 2000 }),
  "fatia-chocolatudo": Object.freeze({ id: "fatia-chocolatudo", itemKey: "slice_chocolatudo", name: "Chocolatudo", priceCents: 2000 }),
  "fatia-chocolate-cenoura": Object.freeze({ id: "fatia-chocolate-cenoura", itemKey: "slice_chocolate_cenoura", name: "Chocolate com Cenoura", priceCents: 2000 }),
});

export const DELIVERY_ZONES = Object.freeze({
  cidade: Object.freeze({ id: "cidade", label: "Dentro da cidade", priceCents: 800, asksNeighborhood: true }),
  acaizal: Object.freeze({ id: "acaizal", label: "Açaizal", priceCents: 1000 }),
  traterra: Object.freeze({ id: "traterra", label: "Traterra", priceCents: 1000 }),
  "novo-canaa": Object.freeze({ id: "novo-canaa", label: "Bairro Novo Canaã", priceCents: 1000 }),
  "floraplac-mdf": Object.freeze({ id: "floraplac-mdf", label: "Floraplac MDF", priceCents: 1000 }),
  "juparana-empresa": Object.freeze({ id: "juparana-empresa", label: "Juparanã Empresa", priceCents: 1000 }),
  "amper-elisa-empresa": Object.freeze({ id: "amper-elisa-empresa", label: "Amper Elisa Empresa", priceCents: 1000 }),
  aeroporto: Object.freeze({ id: "aeroporto", label: "Aeroporto", priceCents: 1600 }),
  ufra: Object.freeze({ id: "ufra", label: "UFRA", priceCents: 1600 }),
  etepa: Object.freeze({ id: "etepa", label: "ETEPA", priceCents: 1600 }),
  "condominio-rural": Object.freeze({ id: "condominio-rural", label: "Condomínio Rural", priceCents: 2400 }),
  "colonia-uraim": Object.freeze({ id: "colonia-uraim", label: "Colônia do Uraim", priceCents: 3500 }),
  frigorifico: Object.freeze({ id: "frigorifico", label: "Frigorífico", priceCents: 2400 }),
  "integral-mix": Object.freeze({ id: "integral-mix", label: "Integral Mix", priceCents: 1600 }),
  pandolfe: Object.freeze({ id: "pandolfe", label: "Pandolfe", priceCents: 3200 }),
  "km-12": Object.freeze({ id: "km-12", label: "KM 12", priceCents: 2000 }),
  "km-15": Object.freeze({ id: "km-15", label: "KM 15", priceCents: 3500 }),
  bambu: Object.freeze({ id: "bambu", label: "Bambu", priceCents: 4000 }),
  nagibao: Object.freeze({ id: "nagibao", label: "Nagibão", priceCents: 4000 }),
  "coopernorte-km-15": Object.freeze({ id: "coopernorte-km-15", label: "Coopernorte KM 15", priceCents: 3500 }),
  "resort-toddys": Object.freeze({ id: "resort-toddys", label: "Resort Toddys", priceCents: 2400 }),
});

function requiredString(value, field, maxLength = 160) {
  if (typeof value !== "string") throw new Error(`Campo inválido: ${field}.`);
  const result = value.normalize("NFC").trim();
  if (!result || result.length > maxLength) throw new Error(`Campo inválido: ${field}.`);
  return result;
}

function quantityOf(value) {
  if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error("Quantidade inválida.");
  return value;
}

export function quoteCartItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 40) {
    throw new Error("Adicione pelo menos um item válido ao pedido.");
  }

  const availabilityKeys = new Set();
  const items = rawItems.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Item inválido no pedido.");
    const productId = requiredString(raw.product_id, "produto", 80);
    const variantId = requiredString(raw.variant_id, "variante", 40);
    const quantity = quantityOf(raw.quantity);
    const rawOptionIds = Array.isArray(raw.option_ids) ? raw.option_ids : [];
    const optionIds = rawOptionIds.map((id) => requiredString(id, "sabor", 80));
    if (new Set(optionIds).size !== optionIds.length) throw new Error("Não repita o mesmo sabor.");

    if (productId === "pipoca-gourmet") {
      const size = POPCORN_SIZES[variantId];
      if (!size) throw new Error("Escolha um tamanho atual de pipoca.");
      if (optionIds.length < 1 || optionIds.length > size.maxOptions) {
        throw new Error(`Escolha de 1 até ${size.maxOptions} sabores para ${size.label}.`);
      }
      const flavors = optionIds.map((id) => {
        const flavor = POPCORN_FLAVORS[id];
        if (!flavor) throw new Error("Escolha um sabor válido de pipoca.");
        return flavor;
      });
      const pricingGroup = Math.max(...flavors.map((flavor) => flavor.pricingGroup));
      const unitPriceCents = POPCORN_PRICES_CENTS[pricingGroup][variantId];
      const optionItemKeys = flavors.map((flavor) => flavor.itemKey);
      availabilityKeys.add(CATEGORY_ITEM_KEYS.pipocas);
      availabilityKeys.add(size.itemKey);
      optionItemKeys.forEach((key) => availabilityKeys.add(key));
      return {
        item_key: "pipoca-gourmet",
        product_id: productId,
        category_key: CATEGORY_ITEM_KEYS.pipocas,
        item_type: "popcorn",
        name: "Pipoca Gourmet",
        variant_id: variantId,
        variant_item_key: size.itemKey,
        size_label: size.label,
        option_ids: optionIds,
        option_item_keys: optionItemKeys,
        option_names: flavors.map((flavor) => flavor.name),
        quantity,
        unit_price_cents: unitPriceCents,
        line_total_cents: unitPriceCents * quantity,
        catalog_version: CATALOG_VERSION,
        pricing_group: pricingGroup,
      };
    }

    const slice = SLICES[productId];
    if (!slice || variantId !== "fatia" || optionIds.length) throw new Error("Escolha uma fatia válida.");
    availabilityKeys.add(CATEGORY_ITEM_KEYS.fatias);
    availabilityKeys.add(slice.itemKey);
    return {
      item_key: slice.itemKey,
      product_id: productId,
      category_key: CATEGORY_ITEM_KEYS.fatias,
      item_type: "slice",
      name: slice.name,
      variant_id: "fatia",
      variant_item_key: slice.itemKey,
      size_label: "1 fatia",
      option_ids: [],
      option_item_keys: [],
      option_names: [],
      quantity,
      unit_price_cents: slice.priceCents,
      line_total_cents: slice.priceCents * quantity,
      catalog_version: CATALOG_VERSION,
    };
  });

  return {
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.line_total_cents, 0),
    availabilityKeys: [...availabilityKeys].sort(),
  };
}

export function quoteFulfillment(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Escolha entrega ou retirada.");
  if (raw.type === "pickup" || raw.type === "retirada") {
    return {
      fulfillment_type: "pickup",
      delivery_zone_id: null,
      neighborhood: null,
      street: null,
      street_number: null,
      complement: null,
      reference: null,
      delivery_fee_cents: 0,
    };
  }
  if (raw.type !== "delivery" && raw.type !== "entrega") throw new Error("Escolha entrega ou retirada.");
  const zoneId = requiredString(raw.zone_id, "região de entrega", 80);
  const zone = DELIVERY_ZONES[zoneId];
  if (!zone) throw new Error("Escolha uma região de entrega válida.");
  const neighborhood = zone.asksNeighborhood
    ? requiredString(raw.neighborhood, "bairro", 120)
    : zone.label;
  return {
    fulfillment_type: "delivery",
    delivery_zone_id: zone.id,
    neighborhood,
    street: requiredString(raw.street, "rua", 180),
    street_number: requiredString(raw.number, "número", 40),
    complement: typeof raw.complement === "string" ? raw.complement.normalize("NFC").trim().slice(0, 180) || null : null,
    reference: typeof raw.reference === "string" ? raw.reference.normalize("NFC").trim().slice(0, 240) || null : null,
    delivery_fee_cents: zone.priceCents,
  };
}
