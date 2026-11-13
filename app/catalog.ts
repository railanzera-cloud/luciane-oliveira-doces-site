import { promotionalPopcornPriceCents } from "../supabase/functions/_shared/popcorn-promotion.mjs";
import { DRINKS as DRINK_CATALOG } from "../supabase/functions/_shared/drinks-catalog.mjs";

export type CategoryId = "pipocas" | "fatias" | "cones" | "natal";
export type ProductKind = "popcorn" | "slice" | "cone" | "drink" | "chocotone";

export type Variant = {
  id: string;
  label: string;
  whatsappLabel: string;
  price: number;
  maxOptions?: number;
  available: boolean;
  retired?: boolean;
};

export type ProductOption = {
  id: string;
  name: string;
  description: string;
  tone: string;
  pricingGroup?: PopcornPricingGroup;
  available: boolean;
};

export type Product = {
  id: string;
  kind: ProductKind;
  category: string;
  name: string;
  cardName?: string; // Somente apresentação na vitrine; manter name nos pedidos.
  subtitle?: string;
  image?: string;
  cardImage?: string;
  imageAlt?: string;
  optionLabel?: string;
  availabilityLabel?: string;
  available: boolean;
  variants: Variant[];
  options: ProductOption[];
};

export type DeliveryZone = {
  id: string;
  label: string;
  price: number;
  group: "mais-pedidas" | "outras-regioes";
  asksNeighborhood?: boolean;
};

// Informações comerciais confirmadas pela loja em 14/09/2026.
export const SLICE_WEIGHT_GRAMS = 380;
export const DELIVERY_TIME_ESTIMATE = "Preparo e entrega: em média, 15 a 20 minutos.";

// Controle geral do atendimento e das categorias exibidas no cardápio.
// Para reativar as pipocas, altere somente `pipocas` para true.
// Bebidas requerem flag local E disponibilidade remota por SKU; a flag não libera estoque.
export const STORE_CONFIG = {
  acceptingOrders: true,
  enabledCategories: {
    pipocas: true,
    fatias: true,
    cones: true,
    natal: true, // coleção temporária: só aparece quando liberada remotamente
  } satisfies Record<CategoryId, boolean>,
  enabledExtras: {
    drinks: true,
  },
  closedMessage: "Pedidos encerrados por hoje.",
};

export type PopcornSize = "500ml" | "750ml" | "1l";
export type PopcornPricingGroup = 1 | 2 | 3;

// Tabela oficial: o conjunto mais alto selecionado define o preço integral do pote.
export const POPCORN_PRICING_GROUPS: Record<PopcornPricingGroup, Record<PopcornSize, number>> = {
  1: { "500ml": 25, "750ml": 39, "1l": 49 },
  2: { "500ml": 30, "750ml": 45, "1l": 55 },
  3: { "500ml": 33, "750ml": 48, "1l": 58 },
};

export const SLICE_OPTIONS: ProductOption[] = [
  { id: "calda-chocolate", name: "Com calda de chocolate", description: "", tone: "#70452e", available: true },
  { id: "calda-ninho", name: "Com calda de Ninho", description: "", tone: "#70452e", available: true },
  { id: "sem-calda", name: "Sem calda, por favor", description: "", tone: "#70452e", available: true },
];

// A ordem ajuda a decidir, mas não pré-seleciona nenhuma calda nem impede combinações.
const NINHO_FIRST_SLICE_IDS = new Set(["fatia-ninho-morango", "fatia-coco-cremoso-morango"]);
export function sliceSauceOptions(productId: string): ProductOption[] {
  return NINHO_FIRST_SLICE_IDS.has(productId)
    ? [SLICE_OPTIONS[1], SLICE_OPTIONS[0], SLICE_OPTIONS[2]]
    : SLICE_OPTIONS;
}

// Nenhuma fatia permanece como rascunho. O cadastro Abacaxi com Brigadeiro Branco
// conserva o ID técnico histórico; a liberação depende do status remoto (inicial Oculto).
export const SLICE_DRAFTS: ReadonlyArray<{ id: string; itemKey: string; name: string; price: number | null; image: string | null }> = [];

// Catálogo central: preços, fotos e disponibilidade são alterados somente aqui.
export const PRODUCTS: Product[] = [
  // Cascão Trufado: manter IDs históricos dos três sabores existentes; disponibilidade individual no Supabase.
  {
    id: "cone-trufado-prestigio", kind: "cone", category: "Cascão Trufado",
    name: "Prestígio", available: true,
    image: "/images/cone-trufado-prestigio-20261113-v478.webp",
    cardImage: "/images/cone-trufado-prestigio-card-20261113-v478.webp",
    imageAlt: "Cascão Prestígio com casca branca coberta de coco, chocolate e beijinho no topo",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 18, available: true }],
    options: [],
  },
  {
    id: "cone-trufado-dois-amores", kind: "cone", category: "Cascão Trufado",
    name: "Dois Amores", available: true,
    image: "/images/cone-trufado-dois-amores-20261113-v475.webp",
    cardImage: "/images/cone-trufado-dois-amores-card-20261113-v475.webp",
    imageAlt: "Cascão Dois Amores com cobertura firme de chocolate e creme claro, em duas metades",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 18, available: true }],
    options: [],
  },
  {
    id: "cone-trufado-ferrero-rocher", kind: "cone", category: "Cascão Trufado",
    name: "Ferrero Rocher", available: true,
    image: "/images/cone-trufado-ferrero-rocher-20261113-v478.webp",
    cardImage: "/images/cone-trufado-ferrero-rocher-card-20261113-v478.webp",
    imageAlt: "Cascão Ferrero Rocher com casca coberta de castanhas e bombom partido no topo",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 20, available: true }],
    options: [],
  },

  // Cascões maiores: apresentações fotográficas ilustrativas, com cenário caseiro de referência.\n  // Três fotos atualizadas em V4.7.4; sabores históricos e IDs comerciais permanecem intactos.
  // Não reutilizar IDs de cones antigos nem de sabores de pipoca.
  {
    id: "cascao-trufado-kinder-bueno", kind: "cone", category: "Cascão Trufado",
    name: "Kinder Bueno", available: true,
    image: "/images/cascao-trufado-kinder-bueno-20261113-v476.webp",
    cardImage: "/images/cascao-trufado-kinder-bueno-card-20261113-v476.webp",
    imageAlt: "Cascão Kinder Bueno artesanal aberto, com pedaços de chocolate e cobertura cremosa",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 20, available: true }],
    options: [],
  },
  {
    id: "cascao-trufado-ninho-morango", kind: "cone", category: "Cascão Trufado",
    name: "Ninho com Morango", available: true,
    image: "/images/cascao-trufado-ninho-morango-20261113-v478.webp",
    cardImage: "/images/cascao-trufado-ninho-morango-card-20261113-v478.webp",
    imageAlt: "Cascão Ninho com Morango de casca escura e morango inteiro no topo, com recheio de Ninho",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 20, available: true }],
    options: [],
  },
  {
    id: "cascao-trufado-ninho-nutella-chocotone", kind: "cone", category: "Cascão Trufado",
    name: "Ninho Nutella e Chocottone", available: true,
    image: "/images/cascao-trufado-ninho-nutella-chocotone-20261113-v479.webp",
    cardImage: "/images/cascao-trufado-ninho-nutella-chocotone-card-20261113-v479.webp",
    imageAlt: "Cascão Ninho Nutella e Chocottone com casca de chocolate escuro, cobertura de chocolate e pedaço de chocottone no topo",
    variants: [{ id: "unidade", label: "1 cascão", whatsappLabel: "1 cascão", price: 20, available: true }],
    options: [],
  },

  {
    id: "pipoca-gourmet",
    kind: "popcorn",
    category: "Pipocas Gourmet",
    name: "Pipoca Gourmet",
    image: "/pipoca-gourmet.jpeg",
    imageAlt: "Pote real de Pipoca Gourmet com três sabores",
    optionLabel: "Sabores",
    available: true,
    variants: [
      // Somente para identificar carrinhos antigos. Sem preço de venda; exige edição.
      { id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 0, maxOptions: 2, available: false, retired: true },
      { id: "500ml", label: "500 ml", whatsappLabel: "500 ml", price: POPCORN_PRICING_GROUPS[1]["500ml"], maxOptions: 2, available: true },
      { id: "750ml", label: "750 ml", whatsappLabel: "750 ml", price: POPCORN_PRICING_GROUPS[1]["750ml"], maxOptions: 2, available: true },
      { id: "1l", label: "1 litro", whatsappLabel: "1 litro", price: POPCORN_PRICING_GROUPS[1]["1l"], maxOptions: 3, available: true },
    ],
    options: [
      { id: "leitinho", name: "Leitinho", description: "Creme branco com leite em pó.", tone: "#f2e3c8", pricingGroup: 1, available: true },
      { id: "choco-nute", name: "Choco Nute", description: "Creme de avelã com cacau.", tone: "#7a432a", pricingGroup: 1, available: true },
      { id: "ovomaltine", name: "Ovomaltine", description: "Creme de avelã com malte, cacau e crocância.", tone: "#8a5232", pricingGroup: 1, available: true },
      { id: "kinder-bueno", name: "Kinder Bueno", description: "Creme de avelã com leite.", tone: "#d6ae88", pricingGroup: 2, available: true },
      { id: "choco-cookies-branco", name: "Choco Cookies Branco", description: "Creme branco de cookies com biscoito cookies.", tone: "#e5d7c8", pricingGroup: 2, available: true },
      { id: "choco-cookies-leite", name: "Choco Cookies ao Leite", description: "Chocolate ao leite com cookies.", tone: "#563126", pricingGroup: 2, available: true },
      // ID preservado para disponibilidade e carrinhos; somente o nome comercial mudou.
      { id: "kinder-bueno-crisp", name: "Crispy Bueno", description: "Creme de Bueno com pedaços crocantes.", tone: "#c88752", pricingGroup: 3, available: true },
      { id: "nutella", name: "Nutella", description: "Creme de avelã com cacau.", tone: "#45281f", pricingGroup: 3, available: true },
    ],
  },
  {
    id: "crocante-ninho", kind: "popcorn", category: "Pipocas Trufadas",
    name: "Ninho", available: true,
    image: "/images/pipocas-trufadas-ninho-20261101.webp", imageAlt: "Pacote com zíper de Pipocas Trufadas Ninho",
    variants: [
      // 400ml e um ID historico, nao corresponde automaticamente ao novo P.
      { id: "400ml", label: "Pacote antigo", whatsappLabel: "Pacote", price: 15.9, maxOptions: 0, available: false, retired: true },
      { id: "p", label: "Pacote P", whatsappLabel: "Pacote P", price: 15.9, maxOptions: 0, available: true },
      { id: "m", label: "Pacote M", whatsappLabel: "Pacote M", price: 18.9, maxOptions: 0, available: true },
      { id: "g", label: "Pacote G", whatsappLabel: "Pacote G", price: 20.9, maxOptions: 0, available: true },
    ],
    options: [],
  },
  {
    id: "trufada-pacoca", kind: "popcorn", category: "Pipocas Trufadas",
    name: "Paçoca", available: true,
    image: "/images/pipocas-trufadas-pacoca-20261101.webp", imageAlt: "Pacote com zíper de Pipocas Trufadas Paçoca",
    variants: [
      { id: "p", label: "Pacote P", whatsappLabel: "Pacote P", price: 14.9, maxOptions: 0, available: true },
      { id: "m", label: "Pacote M", whatsappLabel: "Pacote M", price: 16.9, maxOptions: 0, available: true },
      { id: "g", label: "Pacote G", whatsappLabel: "Pacote G", price: 18.9, maxOptions: 0, available: true },
    ],
    options: [],
  },
  {
    id: "trufada-coco-queimado", kind: "popcorn", category: "Pipocas Trufadas",
    name: "Coco Queimado", available: true,
    image: "/images/pipocas-trufadas-coco-queimado-20261101.webp", imageAlt: "Pacote com zíper de Pipocas Trufadas Coco Queimado",
    variants: [
      { id: "p", label: "Pacote P", whatsappLabel: "Pacote P", price: 14.9, maxOptions: 0, available: true },
      { id: "m", label: "Pacote M", whatsappLabel: "Pacote M", price: 16.9, maxOptions: 0, available: true },
      { id: "g", label: "Pacote G", whatsappLabel: "Pacote G", price: 18.9, maxOptions: 0, available: true },
    ],
    options: [],
  },
  {
    id: "crocante-chocolate", kind: "popcorn", category: "Pipocas Trufadas",
    name: "Caramelo e Chocolate", available: false,
    image: "/images/pipocas-trufadas-chocolate.avif?v=20261017-zoom2", imageAlt: "Pacote historico de Caramelo e Chocolate",
    variants: [{ id: "400ml", label: "Pacote antigo", whatsappLabel: "Pacote", price: 15.9, maxOptions: 0, available: false, retired: true }],
    options: [],
  },
  {
    id: "fatia-chocolate-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Morango",
    image: "/fatia-chocolate-morango.jpeg",
    cardImage: "/fatia-chocolate-morango-card.webp",
    imageAlt: "Fatia artesanal de chocolate com morango",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-ninho-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Brigadeiro Branco com Morango",
    image: "/fatia-ninho-morango.jpeg",
    cardImage: "/fatia-ninho-morango-card.webp",
    imageAlt: "Fatia artesanal de Ninho com morango em massa branca",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-prestigio",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Prestígio",
    image: "/fatia-prestigio.jpeg",
    cardImage: "/fatia-prestigio-card.webp",
    imageAlt: "Fatia artesanal de Prestígio com recheio cremoso",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-chocolate-maracuja",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Maracujá",
    image: "/fatia-chocolate-maracuja.jpeg",
    cardImage: "/fatia-chocolate-maracuja-card.webp",
    imageAlt: "Fatia artesanal de chocolate com maracujá",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-chocolatudo",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolatudo",
    image: "/fatia-chocolatudo.jpeg",
    cardImage: "/fatia-chocolatudo-card-518c74f4.webp",
    imageAlt: "Fatia artesanal de chocolate com recheio de chocolate",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-coco-cremoso-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Geleia de Morango com Coco Cremoso",
    image: "/fatia-coco-cremoso-morango.webp",
    cardImage: "/fatia-coco-cremoso-morango-card.webp",
    imageAlt: "Fatia artesanal de massa branca com coco cremoso e geleia de morango",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-chocolate-cenoura",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Cenoura",
    image: "/fatia-chocolate-cenoura.jpeg",
    cardImage: "/fatia-chocolate-cenoura-card-6de0c35d.webp",
    imageAlt: "Fatia artesanal de bolo de cenoura com chocolate",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    id: "fatia-bombom-uva",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Bombom de Uva",
    image: "/fatia-bombom-uva.avif",
    cardImage: "/fatia-bombom-uva.avif",
    imageAlt: "Fatia artesanal de bolo de chocolate com creme e uvas verdes",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  {
    // ID técnico mantido para respeitar o cadastro remoto existente, ainda Oculto.
    id: "fatia-abacaxi-doce-leite",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Abacaxi com Brigadeiro Branco",
    image: "/fatia-abacaxi-brigadeiro-branco-20261108.jpeg",
    cardImage: "/fatia-abacaxi-brigadeiro-branco-card-20261108.webp",
    imageAlt: "Fatia artesanal de massa clara com pedaços de abacaxi e brigadeiro branco",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SLICE_OPTIONS,
  },
  // Edição especial de Natal: fatias recheadas vendidas individualmente, disponibilidade por sabor no painel.
  {
    id: "chocotone-ninho-nutella", kind: "chocotone", category: "Coleção de Natal",
    name: "Ninho com Nutella", available: true, subtitle: "Ninho com creme de avelã",
    image: "/images/chocotone-ninho-nutella-detail-2026.webp",
    cardImage: "/images/chocotone-ninho-nutella-card-2026.webp",
    imageAlt: "Fatia recheada de Chocottone Ninho com Nutella em prato branco com ambiente natalino",
    variants: [{ id: "porcao", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: [],
  },
  {
    id: "chocotone-ferrero-rocher", kind: "chocotone", category: "Coleção de Natal",
    name: "Ferrero Rocher", available: true, subtitle: "Chocolate com cobertura crocante",
    image: "/images/chocotone-ferrero-rocher-detail-2026.webp",
    cardImage: "/images/chocotone-ferrero-rocher-card-2026.webp",
    imageAlt: "Fatia recheada de Chocottone Ferrero Rocher em prato branco com ambiente natalino",
    variants: [{ id: "porcao", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: [],
  },
  {
    id: "chocotone-casadinho", kind: "chocotone", category: "Coleção de Natal",
    name: "Casadinho", available: true, subtitle: "Creme claro e chocolate",
    image: "/images/chocotone-casadinho-detail-2026.webp",
    cardImage: "/images/chocotone-casadinho-card-2026.webp",
    imageAlt: "Fatia recheada de Chocottone Casadinho em prato branco com ambiente natalino",
    variants: [{ id: "porcao", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: [],
  },
  {
    id: "chocotone-morango-brigadeiro-branco-chocolate", kind: "chocotone", category: "Coleção de Natal",
    name: "Morango com Brigadeiro Branco e Chocolate", available: true, subtitle: "Morango fresco, brigadeiro branco e chocolate",
    image: "/images/chocotone-morango-brigadeiro-branco-chocolate-detail-2026.webp",
    cardImage: "/images/chocotone-morango-brigadeiro-branco-chocolate-card-2026.webp",
    imageAlt: "Fatia recheada de Chocottone Morango com Brigadeiro Branco e Chocolate em prato branco com ambiente natalino",
    variants: [{ id: "porcao", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: [],
  },
  // SKUs, embalagem, fotos e preços vêm do mesmo catálogo autoritativo da Edge.
  ...Object.values(DRINK_CATALOG).map(drink => ({
    id: drink.id,
    kind: "drink" as const,
    category: "Refrigerantes",
    name: drink.name,
    image: drink.image,
    cardImage: drink.image,
    imageAlt: `${drink.name}, ${drink.label}`,
    available: true,
    variants: [{ id: drink.variantId, label: drink.label, whatsappLabel: drink.label, price: drink.priceCents / 100, available: true }],
    options: [],
  })),
];

export const POPCORN = PRODUCTS.find((product) => product.kind === "popcorn")!;
export const SLICES = PRODUCTS.filter((product) => product.kind === "slice");
export const CONES = PRODUCTS.filter((product) => product.kind === "cone");
export const DRINKS = PRODUCTS.filter((product) => product.kind === "drink");
export const CHOCOTONES = PRODUCTS.filter((product) => product.kind === "chocotone");

export function popcornPrice(size: string, optionIds: readonly string[] = [], now = Date.now()): number {
  if (!Object.hasOwn(POPCORN_PRICING_GROUPS[1], size)) throw new Error("Escolha um tamanho atual de pipoca.");
  const group = optionIds.reduce<PopcornPricingGroup>((highest, id) => {
    const option = POPCORN.options.find((candidate) => candidate.id === id);
    if (!option?.pricingGroup) throw new Error("Escolha um sabor válido de pipoca.");
    return Math.max(highest, option.pricingGroup) as PopcornPricingGroup;
  }, 1);
  return promotionalPopcornPriceCents(size, POPCORN_PRICING_GROUPS[group][size as PopcornSize] * 100, now, [...optionIds]) / 100;
}

// As regiões de R$8 e R$10 aparecem primeiro por serem as mais pedidas.
export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "cidade", label: "Dentro da cidade", price: 8, group: "mais-pedidas", asksNeighborhood: true },
  { id: "acaizal", label: "Açaizal", price: 10, group: "mais-pedidas" },
  { id: "traterra", label: "Traterra", price: 10, group: "mais-pedidas" },
  { id: "novo-canaa", label: "Bairro Novo Canaã", price: 10, group: "mais-pedidas" },
  { id: "floraplac-mdf", label: "Floraplac MDF", price: 10, group: "mais-pedidas" },
  { id: "juparana-empresa", label: "Juparanã Empresa", price: 10, group: "mais-pedidas" },
  { id: "ouro-preto", label: "Ouro Preto", price: 10, group: "mais-pedidas" },
  { id: "juparana", label: "Juparanã", price: 8, group: "mais-pedidas" },
  { id: "aragao", label: "Aragão", price: 10, group: "mais-pedidas" },
  { id: "laercio-cabeline", label: "Laércio Cabeline", price: 10, group: "mais-pedidas" },
  { id: "sidney-rosa", label: "Sidney Rosa", price: 10, group: "mais-pedidas" },
  { id: "amper-elisa-empresa", label: "Amper Elisa Empresa", price: 10, group: "mais-pedidas" },
  { id: "aeroporto", label: "Aeroporto", price: 16, group: "outras-regioes" },
  { id: "ufra", label: "UFRA", price: 16, group: "outras-regioes" },
  { id: "etepa", label: "ETEPA", price: 16, group: "outras-regioes" },
  { id: "condominio-rural", label: "Condomínio Rural", price: 24, group: "outras-regioes" },
  { id: "colonia-uraim", label: "Colônia do Uraim", price: 35, group: "outras-regioes" },
  { id: "frigorifico", label: "Frigorífico", price: 24, group: "outras-regioes" },
  { id: "integral-mix", label: "Integral Mix", price: 16, group: "outras-regioes" },
  { id: "pandolfe", label: "Pandolfe", price: 32, group: "outras-regioes" },
  { id: "km-12", label: "KM 12", price: 20, group: "outras-regioes" },
  { id: "km-15", label: "KM 15", price: 35, group: "outras-regioes" },
  { id: "bambu", label: "Bambu", price: 40, group: "outras-regioes" },
  { id: "nagibao", label: "Nagibão", price: 40, group: "outras-regioes" },
  { id: "coopernorte-km-15", label: "Coopernorte KM 15", price: 35, group: "outras-regioes" },
  { id: "resort-toddys", label: "Resort Toddys", price: 24, group: "outras-regioes" },
];
