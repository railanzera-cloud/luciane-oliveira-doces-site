export type CategoryId = "pipocas" | "fatias";
export type ProductKind = "popcorn" | "slice" | "drink";

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

// Controle geral do atendimento e das categorias exibidas no cardápio.
// Para reativar as pipocas, altere somente `pipocas` para true.
// Para reativar os refrigerantes, altere somente `drinks` para true.
export const STORE_CONFIG = {
  acceptingOrders: true,
  enabledCategories: {
    pipocas: true,
    fatias: true,
  } satisfies Record<CategoryId, boolean>,
  enabledExtras: {
    drinks: false,
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

// Catálogo central: preços, fotos e disponibilidade são alterados somente aqui.
export const PRODUCTS: Product[] = [
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
      { id: "leitinho", name: "Leitinho", description: "Creme branco com leite em pó.", tone: "#f3d9a7", pricingGroup: 1, available: true },
      { id: "choco-nute", name: "Choco Nute", description: "Creme de avelã com cacau.", tone: "#7b4025", pricingGroup: 1, available: true },
      { id: "ovomaltine", name: "Ovomaltine", description: "Creme de avelã com malte, cacau e crocância.", tone: "#8b4f2c", pricingGroup: 1, available: true },
      { id: "kinder-bueno", name: "Kinder Bueno", description: "Creme de avelã com leite.", tone: "#d69a66", pricingGroup: 2, available: true },
      { id: "choco-cookies-branco", name: "Choco Cookies Branco", description: "Creme branco de cookies com biscoito cookies.", tone: "#ead8bc", pricingGroup: 2, available: true },
      { id: "choco-cookies-leite", name: "Choco Cookies ao Leite", description: "Chocolate ao leite com cookies.", tone: "#9b6040", pricingGroup: 2, available: true },
      // ID preservado para disponibilidade e carrinhos; somente o nome comercial mudou.
      { id: "kinder-bueno-crisp", name: "Crispy Bueno", description: "Creme de Bueno com pedaços crocantes.", tone: "#c88445", pricingGroup: 3, available: true },
      { id: "nutella", name: "Nutella", description: "Creme de avelã com cacau.", tone: "#7b4025", pricingGroup: 3, available: true },
    ],
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
    options: [],
  },
  {
    id: "fatia-ninho-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Ninho com Morango",
    subtitle: "Massa branca",
    image: "/fatia-ninho-morango.jpeg",
    cardImage: "/fatia-ninho-morango-card.webp",
    imageAlt: "Fatia artesanal de Ninho com morango em massa branca",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: [],
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
    options: [],
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
    options: [],
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
    options: [],
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
    options: [],
  },
  {
    id: "coca-cola-220",
    kind: "drink",
    category: "Refrigerantes",
    name: "Coca-Cola",
    image: "/coca-cola-220.jpeg",
    cardImage: "/coca-cola-220-card.webp",
    imageAlt: "Lata gelada de Coca-Cola 220 ml",
    available: true,
    variants: [{ id: "220ml", label: "220 ml", whatsappLabel: "220 ml", price: 5, available: true }],
    options: [],
  },
  {
    id: "coca-cola-350",
    kind: "drink",
    category: "Refrigerantes",
    name: "Coca-Cola",
    image: "/coca-cola-350.jpeg",
    cardImage: "/coca-cola-350-card.webp",
    imageAlt: "Lata gelada de Coca-Cola 350 ml",
    available: true,
    variants: [{ id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 6, available: true }],
    options: [],
  },
  {
    id: "fanta-laranja-350",
    kind: "drink",
    category: "Refrigerantes",
    name: "Fanta Laranja",
    image: "/fanta-laranja-350.jpeg",
    cardImage: "/fanta-laranja-350-card.webp",
    imageAlt: "Lata gelada de Fanta Laranja 350 ml",
    available: true,
    variants: [{ id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 5, available: true }],
    options: [],
  },
];

export const POPCORN = PRODUCTS.find((product) => product.kind === "popcorn")!;
export const SLICES = PRODUCTS.filter((product) => product.kind === "slice");
export const DRINKS = PRODUCTS.filter((product) => product.kind === "drink");

export function popcornPrice(size: string, optionIds: readonly string[] = []): number {
  if (!Object.hasOwn(POPCORN_PRICING_GROUPS[1], size)) throw new Error("Escolha um tamanho atual de pipoca.");
  const group = optionIds.reduce<PopcornPricingGroup>((highest, id) => {
    const option = POPCORN.options.find((candidate) => candidate.id === id);
    if (!option?.pricingGroup) throw new Error("Escolha um sabor válido de pipoca.");
    return Math.max(highest, option.pricingGroup) as PopcornPricingGroup;
  }, 1);
  return POPCORN_PRICING_GROUPS[group][size as PopcornSize];
}

// As regiões de R$8 e R$10 aparecem primeiro por serem as mais pedidas.
export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "cidade", label: "Dentro da cidade", price: 8, group: "mais-pedidas", asksNeighborhood: true },
  { id: "acaizal", label: "Açaizal", price: 10, group: "mais-pedidas" },
  { id: "traterra", label: "Traterra", price: 10, group: "mais-pedidas" },
  { id: "novo-canaa", label: "Bairro Novo Canaã", price: 10, group: "mais-pedidas" },
  { id: "floraplac-mdf", label: "Floraplac MDF", price: 10, group: "mais-pedidas" },
  { id: "juparana-empresa", label: "Juparanã Empresa", price: 10, group: "mais-pedidas" },
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
