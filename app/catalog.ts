export type CategoryId = "pipocas" | "fatias";
export type ProductKind = "popcorn" | "slice" | "drink";

export type Variant = {
  id: string;
  label: string;
  whatsappLabel: string;
  price: number;
  maxOptions?: number;
  available: boolean;
};

export type ProductOption = {
  id: string;
  name: string;
  description: string;
  tone: string;
  priceAdjustment?: number;
  available: boolean;
};

export type Product = {
  id: string;
  kind: ProductKind;
  category: string;
  name: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  optionLabel?: string;
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
export const STORE_CONFIG = {
  acceptingOrders: true,
  enabledCategories: {
    pipocas: false,
    fatias: true,
  } satisfies Record<CategoryId, boolean>,
  closedMessage: "Pedidos encerrados por hoje.",
};

export const SAUCES: ProductOption[] = [
  {
    id: "calda-chocolate",
    name: "Chocolate",
    description: "Calda de chocolate.",
    tone: "#74412a",
    available: true,
  },
  {
    id: "calda-ninho",
    name: "Ninho",
    description: "Calda de Ninho.",
    tone: "#ead9ba",
    available: true,
  },
];

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
      { id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 20, maxOptions: 2, available: true },
      { id: "500ml", label: "500 ml", whatsappLabel: "500 ml", price: 25, maxOptions: 2, available: true },
      { id: "750ml", label: "750 ml", whatsappLabel: "750 ml", price: 39, maxOptions: 2, available: true },
      { id: "1l", label: "1 litro", whatsappLabel: "1 litro", price: 49, maxOptions: 3, available: true },
    ],
    options: [
      { id: "leitinho", name: "Leitinho", description: "Creme branco com leite em pó.", tone: "#f3d9a7", available: true },
      { id: "nutella", name: "Nutella", description: "Creme de avelã com cacau.", tone: "#7b4025", available: true },
      { id: "kinder-bueno", name: "Kinder Bueno", description: "Creme de avelã com leite.", tone: "#d69a66", available: true },
      { id: "kinder-bueno-crisp", name: "Kinder Bueno Crisp", description: "Creme de avelã com leite e pedaços crocantes.", tone: "#c88445", priceAdjustment: 5, available: true },
      { id: "choco-cookies-branco", name: "Choco Cookies Branco", description: "Creme branco com cookies.", tone: "#ead8bc", available: true },
      { id: "choco-cookies-leite", name: "Choco Cookies ao Leite", description: "Chocolate ao leite com cookies.", tone: "#9b6040", available: true },
      { id: "ovomaltine", name: "Ovomaltine", description: "Creme de avelã com malte, cacau e crocância.", tone: "#8b4f2c", available: true },
    ],
  },
  {
    id: "fatia-chocolate-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Morango",
    image: "/fatia-chocolate-morango.jpeg",
    imageAlt: "Fatia artesanal de chocolate com morango",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-ninho-morango",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Ninho com Morango",
    subtitle: "Massa branca",
    image: "/fatia-ninho-morango.jpeg",
    imageAlt: "Fatia artesanal de Ninho com morango em massa branca",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 22, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolate-maracuja",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Maracujá",
    image: "/fatia-chocolate-maracuja.jpeg",
    imageAlt: "Fatia artesanal de chocolate com maracujá",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolatudo",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolatudo",
    image: "/fatia-chocolatudo.jpeg",
    imageAlt: "Fatia artesanal de chocolate com recheio de chocolate",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "fatia-chocolate-cenoura",
    kind: "slice",
    category: "Fatias Artesanais",
    name: "Chocolate com Cenoura",
    image: "/fatia-chocolate-cenoura.jpeg",
    imageAlt: "Fatia artesanal de bolo de cenoura com chocolate",
    optionLabel: "Calda",
    available: true,
    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }],
    options: SAUCES,
  },
  {
    id: "coca-cola-220",
    kind: "drink",
    category: "Refrigerantes",
    name: "Coca-Cola",
    image: "/coca-cola-220.jpeg",
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
    imageAlt: "Lata gelada de Fanta Laranja 350 ml",
    available: true,
    variants: [{ id: "350ml", label: "350 ml", whatsappLabel: "350 ml", price: 5, available: true }],
    options: [],
  },
];

export const POPCORN = PRODUCTS.find((product) => product.kind === "popcorn")!;
export const SLICES = PRODUCTS.filter((product) => product.kind === "slice");
export const DRINKS = PRODUCTS.filter((product) => product.kind === "drink");

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
