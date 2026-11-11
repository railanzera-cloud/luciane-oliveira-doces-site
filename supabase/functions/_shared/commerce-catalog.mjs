import { deliveryLocalityById, deliveryLegacyReviewState, deliveryLegacySpecificCandidate, deliveryLegacySpecialMentionCount, deliveryLocalityCanQuote, normalizeDeliverySearch } from "./delivery-localities.mjs";
import { promotionalPopcornPriceCents } from "./popcorn-promotion.mjs";
// Snapshot comercial autoritativo do backend. Valores em centavos evitam ponto flutuante.
// Ao alterar o catálogo público, os testes de paridade devem ser atualizados na mesma versão.
export const CATALOG_VERSION = "2026-11-11.colecao-natal-porcoes";
import { TRUFADAS_VARIANTS, getTrufadaVariant } from "./trufadas-variants.mjs";

// O catálogo de vendas consulta cada combinação exata: produto + tamanho.
export const CROCANTES = TRUFADAS_VARIANTS;

export const CATEGORY_ITEM_KEYS = Object.freeze({
  pipocas: "category_pipocas",
  fatias: "category_fatias",
  cones: "category_cones",
  natal: "category_natal",
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

// Preços em centavos definidos pela Luciane; cada cone é vendido por unidade.
export const CONES = Object.freeze({
  "cone-trufado-prestigio": Object.freeze({ id: "cone-trufado-prestigio", itemKey: "cone_prestigio", name: "Prestígio", priceCents: 1400 }),
  "cone-trufado-dois-amores": Object.freeze({ id: "cone-trufado-dois-amores", itemKey: "cone_dois_amores", name: "Dois Amores", priceCents: 1400 }),
  "cone-trufado-ferrero-rocher": Object.freeze({ id: "cone-trufado-ferrero-rocher", itemKey: "cone_ferrero_rocher", name: "Ferrero Rocher", priceCents: 1600 }),
});

// Chocotones são porções individuais, não fatias, cones ou panetones inteiros.
export const CHOCOTONES = Object.freeze({
  "chocotone-ninho-nutella": Object.freeze({ id: "chocotone-ninho-nutella", itemKey: "chocotone_ninho_nutella", name: "Ninho com Nutella", priceCents: 1899 }),
  "chocotone-ferrero-rocher": Object.freeze({ id: "chocotone-ferrero-rocher", itemKey: "chocotone_ferrero_rocher", name: "Ferrero Rocher", priceCents: 1899 }),
  "chocotone-casadinho": Object.freeze({ id: "chocotone-casadinho", itemKey: "chocotone_casadinho", name: "Casadinho", priceCents: 1699 }),
  "chocotone-morango-brigadeiro-branco-chocolate": Object.freeze({ id: "chocotone-morango-brigadeiro-branco-chocolate", itemKey: "chocotone_morango_brigadeiro_branco_chocolate", name: "Morango com Brigadeiro Branco e Chocolate", priceCents: 1899 }),
});

export const SLICES = Object.freeze({
  "fatia-chocolate-morango": Object.freeze({ id: "fatia-chocolate-morango", itemKey: "slice_chocolate_morango", name: "Chocolate com Morango", priceCents: 2200 }),
  "fatia-ninho-morango": Object.freeze({ id: "fatia-ninho-morango", itemKey: "slice_ninho_morango", name: "Brigadeiro Branco com Morango", priceCents: 2200 }),
  "fatia-prestigio": Object.freeze({ id: "fatia-prestigio", itemKey: "slice_prestigio", name: "Prestígio", priceCents: 2000 }),
  "fatia-chocolate-maracuja": Object.freeze({ id: "fatia-chocolate-maracuja", itemKey: "slice_chocolate_maracuja", name: "Chocolate com Maracujá", priceCents: 2000 }),
  "fatia-chocolatudo": Object.freeze({ id: "fatia-chocolatudo", itemKey: "slice_chocolatudo", name: "Chocolatudo", priceCents: 2000 }),
  "fatia-coco-cremoso-morango": Object.freeze({ id: "fatia-coco-cremoso-morango", itemKey: "slice_coco_cremoso_morango", name: "Geleia de Morango com Coco Cremoso", priceCents: 2000 }),
  "fatia-chocolate-cenoura": Object.freeze({ id: "fatia-chocolate-cenoura", itemKey: "slice_chocolate_cenoura", name: "Chocolate com Cenoura", priceCents: 2000 }),
  "fatia-bombom-uva": Object.freeze({ id: "fatia-bombom-uva", itemKey: "slice_bombom_uva", name: "Bombom de Uva", priceCents: 2000 }),
  "fatia-abacaxi-doce-leite": Object.freeze({ id: "fatia-abacaxi-doce-leite", itemKey: "slice_abacaxi_doce_leite", name: "Abacaxi com Brigadeiro Branco", priceCents: 2000 }),
});

export const DELIVERY_ZONES = Object.freeze({
  cidade: Object.freeze({ id: "cidade", label: "Dentro da cidade", priceCents: 800, asksNeighborhood: true }),
  acaizal: Object.freeze({ id: "acaizal", label: "Açaizal", priceCents: 1000 }),
  traterra: Object.freeze({ id: "traterra", label: "Traterra", priceCents: 1000 }),
  "novo-canaa": Object.freeze({ id: "novo-canaa", label: "Bairro Novo Canaã", priceCents: 1000 }),
  "floraplac-mdf": Object.freeze({ id: "floraplac-mdf", label: "Floraplac MDF", priceCents: 1000 }),
  "juparana-empresa": Object.freeze({ id: "juparana-empresa", label: "Juparanã Empresa", priceCents: 1000 }),
  "ouro-preto": Object.freeze({ id: "ouro-preto", label: "Ouro Preto", priceCents: 1000 }),
  "juparana": Object.freeze({ id: "juparana", label: "Juparanã", priceCents: 800 }),
  "aragao": Object.freeze({ id: "aragao", label: "Aragão", priceCents: 1000 }),
  "laercio-cabeline": Object.freeze({ id: "laercio-cabeline", label: "Laércio Cabeline", priceCents: 1000 }),
  "sidney-rosa": Object.freeze({ id: "sidney-rosa", label: "Sidney Rosa", priceCents: 1000 }),
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

// Clientes legados não enviam locality_id. Detecta referências inequívocas a
// localidades com tarifa especial, sem atribuir preço por similaridade.
export function deliveryZoneMismatchMessage(zoneId, neighborhood) {
  if (typeof zoneId !== "string" || !Object.hasOwn(DELIVERY_ZONES, zoneId)
      || !DELIVERY_ZONES[zoneId].asksNeighborhood || typeof neighborhood !== "string") return "";
  const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
  const normalized = normalize(neighborhood);
  const matchingLocality = deliveryLegacySpecificCandidate(neighborhood);
  const specific = matchingLocality?.zoneId && matchingLocality.zoneId !== "cidade"
    ? DELIVERY_ZONES[matchingLocality.zoneId]
    : Object.values(DELIVERY_ZONES).find(zone => !zone.asksNeighborhood && normalize(zone.label) === normalized);
  if (!specific && deliveryLegacySpecialMentionCount(neighborhood) > 1) {
    return "O endereço menciona mais de uma região com taxa especial. Confirme o bairro correto antes de finalizar.";
  }
  if (!specific) return "";
  const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(specific.priceCents / 100).replace(/\u00a0/g, " ");
  return `Esse local possui uma taxa de entrega específica. Selecione ‘${specific.label} — ${price}’ em ‘Onde será a entrega?’.`;
}

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

export function quoteCartItems(rawItems, now = Date.now()) {
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

    if (Object.hasOwn(CROCANTES, productId)) {
      const product = CROCANTES[productId];
      const variant = getTrufadaVariant(productId, variantId);
      if (!variant || optionIds.length !== 0) throw new Error("Escolha um pacote e tamanho de Pipocas Trufadas válido.");
      availabilityKeys.add(CATEGORY_ITEM_KEYS.pipocas);
      availabilityKeys.add(variant.itemKey);
      return {
        item_key: variant.itemKey, product_id: productId,
        category_key: CATEGORY_ITEM_KEYS.pipocas, item_type: "popcorn",
        name: `Pipocas Trufadas — ${product.name}`, variant_id: variant.id,
        variant_item_key: variant.itemKey,
        size_label: variant.label, option_ids: [], option_item_keys: [],
        option_names: [], quantity, unit_price_cents: variant.priceCents,
        line_total_cents: variant.priceCents * quantity, catalog_version: CATALOG_VERSION,
      };
    }
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
      const unitPriceCents = promotionalPopcornPriceCents(variantId, POPCORN_PRICES_CENTS[pricingGroup][variantId], now, optionIds);
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

    // Cones Trufados são produtos próprios, sem caldas de fatias e sem variantes
    // de tamanho. A cotação autoritativa protege valor, SKU e disponibilidade.
    if (Object.hasOwn(CONES, productId)) {
      const cone = CONES[productId];
      if (variantId !== "unidade" || optionIds.length !== 0)
        throw new Error("Escolha um Cone Trufado válido.");
      availabilityKeys.add(CATEGORY_ITEM_KEYS.cones);
      availabilityKeys.add(cone.itemKey);
      return {
        item_key: cone.itemKey, product_id: productId,
        category_key: CATEGORY_ITEM_KEYS.cones, item_type: "cone",
        name: `Cone Trufado — ${cone.name}`,
        variant_id: "unidade", variant_item_key: cone.itemKey,
        size_label: "1 cone", option_ids: [], option_item_keys: [],
        option_names: [], quantity, unit_price_cents: cone.priceCents,
        line_total_cents: cone.priceCents * quantity, catalog_version: CATALOG_VERSION,
      };
    }
    if (Object.hasOwn(CHOCOTONES, productId)) {
      const product = CHOCOTONES[productId];
      if (variantId !== "porcao" || optionIds.length !== 0)
        throw new Error("Escolha uma porção individual de Chocotone válida.");
      availabilityKeys.add(CATEGORY_ITEM_KEYS.natal);
      availabilityKeys.add(product.itemKey);
      return {
        item_key: product.itemKey, product_id: productId,
        category_key: CATEGORY_ITEM_KEYS.natal, item_type: "chocotone",
        name: `Chocotone — ${product.name}`,
        variant_id: "porcao", variant_item_key: product.itemKey,
        size_label: "1 porção individual", option_ids: [], option_item_keys: [],
        option_names: [], quantity, unit_price_cents: product.priceCents,
        line_total_cents: product.priceCents * quantity, catalog_version: CATALOG_VERSION,
      };
    }

    const slice = SLICES[productId];
    const sauceNames = { "calda-chocolate": "Com calda de chocolate", "calda-ninho": "Com calda de Ninho", "sem-calda": "Sem calda, por favor" };
    if (!slice || variantId !== "fatia" || optionIds.length > 1 || optionIds.some(id => !Object.hasOwn(sauceNames, id))) throw new Error("Escolha uma fatia válida.");
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
      option_ids: optionIds,
      option_item_keys: [],
      option_names: optionIds.map(id => sauceNames[id]),
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
  // Object.hasOwn impede acesso a entradas herdadas como "constructor" e "__proto__"
  // quando a API recebe um identificador adulterado pelo navegador.
  if (!Object.hasOwn(DELIVERY_ZONES, zoneId)) throw new Error("Escolha uma região de entrega válida.");
  const zone = DELIVERY_ZONES[zoneId];
  if (!Number.isSafeInteger(zone.priceCents) || zone.priceCents < 0) {
    throw new Error("Não foi possível calcular a taxa. Confirme a região com a loja.");
  }
  // O novo checkout sempre envia locality_id. Em publicação faseada, clientes da
  // versão antiga continuam aceitos até o flag DELIVERY_REQUIRE_LOCALITY_ID ser ativado
  // após comprovar frontend + Edge atualizados. Sem o flag, o modo legado é limitado.
  const explicitLocalityId = raw.locality_id;
  const requireLocalityId = globalThis.Deno?.env?.get("DELIVERY_REQUIRE_LOCALITY_ID") === "true";
  if (requireLocalityId && !explicitLocalityId) throw new Error("Atualize a página para selecionar seu bairro.");
  const locality = explicitLocalityId == null ? null : deliveryLocalityById(explicitLocalityId);
  if (explicitLocalityId != null && !deliveryLocalityCanQuote(locality)) {
    throw new Error("Selecione um bairro com taxa de entrega confirmada.");
  }
  if (locality && locality.zoneId !== zone.id) {
    throw new Error("Bairro e taxa de entrega não correspondem. Selecione novamente seu bairro.");
  }
  if (locality && typeof raw.neighborhood === "string"
      && normalizeDeliverySearch(raw.neighborhood) !== normalizeDeliverySearch(locality.label)) {
    throw new Error("O bairro informado não corresponde ao selecionado. Revise a entrega.");
  }
  const neighborhood = locality?.label ?? (zone.asksNeighborhood
    ? requiredString(raw.neighborhood, "bairro", 120) : zone.label);
  const mismatch = deliveryZoneMismatchMessage(zone.id, neighborhood);
  if (mismatch) throw new Error(mismatch);
  // Etapa opcional da implantação: impede cotar nomes conhecidos que ainda
  // precisam de validação, mas preserva inicialmente clientes antigos ativos.
  // Continua distinta da flag final DELIVERY_REQUIRE_LOCALITY_ID: nomes não
  // cadastrados só serão impedidos após a exigência de IDs no frontend novo.
  if (!locality && zone.asksNeighborhood
      && globalThis.Deno?.env?.get("DELIVERY_LEGACY_REVIEW_GUARD") === "true") {
    const reviewState = deliveryLegacyReviewState(neighborhood);
    if (reviewState === "pending" || reviewState === "ambiguous") {
      throw new Error("Esse bairro precisa de confirmação da taxa com a loja. Atualize a página para selecionar o bairro.");
    }
  }
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
