import {
  POPCORN,
  SLICES,
  CONES,
  CHOCOTONES,
  SLICE_DRAFTS,
  STORE_CONFIG,
  type CategoryId,
} from "@/app/catalog";

export const AVAILABILITY_STATUSES = ["available", "sold_out", "hidden"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];
export type AvailabilityItemType = "category" | "popcorn_size" | "popcorn_flavor" | "slice" | "product";

export type MenuAvailabilityItem = {
  itemKey: string;
  name: string;
  itemType: AvailabilityItemType;
  categoryKey: string;
  isDraft?: boolean;
};

export type MenuAvailabilityRow = {
  id?: string;
  item_key: string;
  name: string;
  item_type: AvailabilityItemType;
  category_key: string;
  status: AvailabilityStatus;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type PublicTrufadasStockRow = { item_key: string; available: number };
export type PublicSlicePreorder = { item_key?: string; active: boolean; remaining: number; ready_at?: string };

export type AvailabilitySnapshot = {
  /** Estoque disponível após descontar reservas válidas, informado pelo Supabase. */
  stockRemaining: Record<string, number>;
  stockChecked: boolean;
  slicePreorder: PublicSlicePreorder | null;
  ordersOpen: boolean;
  statuses: Record<string, AvailabilityStatus>;
  source: "fallback" | "supabase";
  loadedAt: number;
};

import { TRUFADAS_ACTIVE_ITEM_KEYS, TRUFADAS_VARIANTS, TRUFADAS_LEGACY } from "../supabase/functions/_shared/trufadas-variants.mjs";

export const CROCANTES_ITEM_KEYS: Record<string, string> = Object.fromEntries(
  Object.values(TRUFADAS_VARIANTS).map((product) => [product.productId, product.sizes.p.itemKey]),
);
export const TRUFADA_STOCK_ITEM_KEYS: readonly string[] = TRUFADAS_ACTIVE_ITEM_KEYS;
export const TRUFADA_LEGACY_ITEM_KEYS = Object.values(TRUFADAS_LEGACY).map((item) => item.itemKey);
export function trufadaStockItemKey(productId: string, variantId: string): string | null {
  const product = Object.hasOwn(TRUFADAS_VARIANTS, productId)
    ? TRUFADAS_VARIANTS[productId as keyof typeof TRUFADAS_VARIANTS]
    : null;
  if (!product) return null;
  return Object.hasOwn(product.sizes, variantId)
    ? product.sizes[variantId as keyof typeof product.sizes].itemKey
    : null;
}
export const CATEGORY_ITEM_KEYS: Record<CategoryId, string> = {
  pipocas: "category_pipocas",
  fatias: "category_fatias",
  cones: "category_cones",
  natal: "category_natal",
};

export const POPCORN_SIZE_ITEM_KEYS: Record<string, string> = {
  "350ml": "popcorn_size_350ml",
  "500ml": "popcorn_size_500ml",
  "750ml": "popcorn_size_750ml",
  "1l": "popcorn_size_1l",
};

export const POPCORN_FLAVOR_ITEM_KEYS: Record<string, string> = {
  leitinho: "popcorn_flavor_leitinho",
  "choco-nute": "popcorn_flavor_choco_nute",
  nutella: "popcorn_flavor_nutella",
  "kinder-bueno": "popcorn_flavor_kinder_bueno",
  "kinder-bueno-crisp": "popcorn_flavor_kinder_bueno_crisp",
  "choco-cookies-branco": "popcorn_flavor_choco_cookies_branco",
  "choco-cookies-leite": "popcorn_flavor_choco_cookies_leite",
  ovomaltine: "popcorn_flavor_ovomaltine",
};

export const CONE_ITEM_KEYS: Record<string, string> = {
  "cone-trufado-prestigio": "cone_prestigio",
  "cone-trufado-dois-amores": "cone_dois_amores",
  "cone-trufado-ferrero-rocher": "cone_ferrero_rocher",
};

export const CHOCOTONE_ITEM_KEYS: Record<string, string> = {
  "chocotone-ninho-nutella": "chocotone_ninho_nutella",
  "chocotone-ferrero-rocher": "chocotone_ferrero_rocher",
  "chocotone-casadinho": "chocotone_casadinho",
  "chocotone-morango-brigadeiro-branco-chocolate": "chocotone_morango_brigadeiro_branco_chocolate",
};

export const SLICE_ITEM_KEYS: Record<string, string> = {
  "fatia-chocolate-morango": "slice_chocolate_morango",
  "fatia-ninho-morango": "slice_ninho_morango",
  "fatia-prestigio": "slice_prestigio",
  "fatia-chocolate-maracuja": "slice_chocolate_maracuja",
  "fatia-chocolatudo": "slice_chocolatudo",
  "fatia-coco-cremoso-morango": "slice_coco_cremoso_morango",
  "fatia-chocolate-cenoura": "slice_chocolate_cenoura",
  "fatia-bombom-uva": "slice_bombom_uva",
  "fatia-abacaxi-doce-leite": "slice_abacaxi_doce_leite",
};

const CATEGORY_ITEMS: MenuAvailabilityItem[] = [
  {
    itemKey: CATEGORY_ITEM_KEYS.pipocas,
    name: "Pipocas Gourmet",
    itemType: "category",
    categoryKey: CATEGORY_ITEM_KEYS.pipocas,
  },
  {
    itemKey: CATEGORY_ITEM_KEYS.fatias,
    name: "Fatias Artesanais",
    itemType: "category",
    categoryKey: CATEGORY_ITEM_KEYS.fatias,
  },
  { itemKey: CATEGORY_ITEM_KEYS.cones, name: "Cones Trufados",
    itemType: "category", categoryKey: CATEGORY_ITEM_KEYS.cones },
  { itemKey: CATEGORY_ITEM_KEYS.natal, name: "Edição Especial de Natal",
    itemType: "category", categoryKey: CATEGORY_ITEM_KEYS.natal },
];

const POPCORN_SIZE_ITEMS: MenuAvailabilityItem[] = POPCORN.variants.filter((variant) => !variant.retired).map((variant) => ({
  itemKey: POPCORN_SIZE_ITEM_KEYS[variant.id],
  name: `Pipoca Gourmet — ${variant.label}`,
  itemType: "popcorn_size",
  categoryKey: CATEGORY_ITEM_KEYS.pipocas,
}));

const POPCORN_FLAVOR_ITEMS: MenuAvailabilityItem[] = POPCORN.options.map((option) => ({
  itemKey: POPCORN_FLAVOR_ITEM_KEYS[option.id],
  name: option.name,
  itemType: "popcorn_flavor",
  categoryKey: CATEGORY_ITEM_KEYS.pipocas,
}));

const CONE_ITEMS: MenuAvailabilityItem[] = CONES.map(cone => ({
  itemKey: CONE_ITEM_KEYS[cone.id],
  name: cone.name,
  itemType: "product",
  categoryKey: CATEGORY_ITEM_KEYS.cones,
}));

const CHOCOTONE_ITEMS: MenuAvailabilityItem[] = CHOCOTONES.map((product) => ({
  itemKey: CHOCOTONE_ITEM_KEYS[product.id], name: `Chocotone — ${product.name}`,
  itemType: "product", categoryKey: CATEGORY_ITEM_KEYS.natal,
}));

const SLICE_ITEMS: MenuAvailabilityItem[] = SLICES.map((slice) => ({
  itemKey: SLICE_ITEM_KEYS[slice.id],
  name: slice.subtitle ? `${slice.name} — ${slice.subtitle}` : slice.name,
  itemType: "slice",
  categoryKey: CATEGORY_ITEM_KEYS.fatias,
}));

// Aparece no /admin como preparação, mas não no catálogo de compra.
const SLICE_DRAFT_ITEMS: MenuAvailabilityItem[] = SLICE_DRAFTS.map(draft => ({
  itemKey: draft.itemKey,
  name: draft.name,
  itemType: "slice",
  categoryKey: CATEGORY_ITEM_KEYS.fatias,
  isDraft: true,
}));

export const MENU_AVAILABILITY_ITEMS: MenuAvailabilityItem[] = [
  ...CATEGORY_ITEMS,
  ...Object.values(TRUFADAS_VARIANTS).flatMap((product) =>
    Object.values(product.sizes).map((variant) => ({
      itemKey: variant.itemKey,
      name: `Trufadas — ${product.name} · ${variant.label}`,
      itemType: "product" as const,
      categoryKey: CATEGORY_ITEM_KEYS.pipocas,
    }))),
  { itemKey: TRUFADAS_LEGACY["crocante-ninho"].itemKey, name: "Histórico — Ninho, pacote antigo", itemType: "product", categoryKey: CATEGORY_ITEM_KEYS.pipocas },
  { itemKey: TRUFADAS_LEGACY["crocante-chocolate"].itemKey, name: "Histórico — Caramelo e Chocolate", itemType: "product", categoryKey: CATEGORY_ITEM_KEYS.pipocas },
  ...POPCORN_SIZE_ITEMS,
  ...POPCORN_FLAVOR_ITEMS,
  ...SLICE_ITEMS,
  ...SLICE_DRAFT_ITEMS,
  ...CONE_ITEMS,
  ...CHOCOTONE_ITEMS,
];

const KNOWN_ITEM_KEYS = new Set(MENU_AVAILABILITY_ITEMS.map((item) => item.itemKey));

function staticStatus(available: boolean): AvailabilityStatus {
  return available ? "available" : "sold_out";
}

export function createFallbackAvailability(): AvailabilitySnapshot {
  const statuses: Record<string, AvailabilityStatus> = {
    [CATEGORY_ITEM_KEYS.pipocas]: STORE_CONFIG.enabledCategories.pipocas ? "available" : "hidden",
    [CATEGORY_ITEM_KEYS.fatias]: STORE_CONFIG.enabledCategories.fatias ? "available" : "hidden",
    [CATEGORY_ITEM_KEYS.cones]: "hidden", // ativação só após publicação validada
    [CATEGORY_ITEM_KEYS.natal]: "hidden", // lançamento sazonal só após liberação remota
  };

  for (const variant of POPCORN.variants) {
    statuses[POPCORN_SIZE_ITEM_KEYS[variant.id]] = staticStatus(POPCORN.available && variant.available);
  }
  for (const option of POPCORN.options) {
    statuses[POPCORN_FLAVOR_ITEM_KEYS[option.id]] = staticStatus(POPCORN.available && option.available);
  }
  for (const key of [...TRUFADA_STOCK_ITEM_KEYS, ...TRUFADA_LEGACY_ITEM_KEYS]) statuses[key] = "sold_out";
  for (const slice of SLICES) {
    statuses[SLICE_ITEM_KEYS[slice.id]] = staticStatus(Boolean(slice.available && slice.variants[0]?.available));
  }

  // Lançamento Abacaxi: nunca exibir via fallback offline, apenas se a linha remota
  // existente tiver sido explicitamente liberada no painel administrativo.
  statuses[SLICE_ITEM_KEYS["fatia-abacaxi-doce-leite"]] = "hidden";
  // Novo cadastro só pode ser exibido depois que a linha remota for confirmada.
  statuses[SLICE_ITEM_KEYS["fatia-bombom-uva"]] = "hidden";
  for (const draft of SLICE_DRAFTS) statuses[draft.itemKey] = "hidden";
  for (const cone of CONE_ITEMS) statuses[cone.itemKey] = "hidden";
  for (const chocotone of CHOCOTONE_ITEMS) statuses[chocotone.itemKey] = "hidden";

  return {
    ordersOpen: STORE_CONFIG.acceptingOrders,
    statuses,
    source: "fallback",
    stockRemaining: {},
    stockChecked: false,
    slicePreorder: null,
    loadedAt: Date.now(),
  };
}

export function mergeRemoteAvailability(
  rows: MenuAvailabilityRow[],
  ordersOpen: boolean,
  trufadasStock?: PublicTrufadasStockRow[] | null,
  slicePreorder?: PublicSlicePreorder | null,
): AvailabilitySnapshot {
  const fallback = createFallbackAvailability();
  const statuses = { ...fallback.statuses };
  // Novo sabor só pode ser comprado após seu cadastro remoto ser confirmado.
  statuses[POPCORN_FLAVOR_ITEM_KEYS["choco-nute"]] = "sold_out";

  for (const row of rows) {
    if (KNOWN_ITEM_KEYS.has(row.item_key) && AVAILABILITY_STATUSES.includes(row.status)) {
      statuses[row.item_key] = row.status;
    }
  }
  // Um rascunho sem preço/foto nunca se torna vendável por um status remoto.
  for (const draft of SLICE_DRAFTS) statuses[draft.itemKey] = "hidden";

  const verifiedPreorder = slicePreorder?.item_key === "slice_chocolate_morango"
    && slicePreorder.active === true && Number.isSafeInteger(slicePreorder.remaining)
    && slicePreorder.remaining >= 0 && Boolean(slicePreorder.ready_at) ? slicePreorder : null;
  if (verifiedPreorder?.remaining && statuses.slice_chocolate_morango === "sold_out")
    statuses.slice_chocolate_morango = "available";
  const stockRemaining: Record<string, number> = {};
  let stockChecked = false;
  // Em caso de falha na consulta de quantidade, somente os Trufados ficam bloqueados.
  // Produtos Gourmet e fatias continuam com a disponibilidade própria.
  if (trufadasStock !== undefined) {
    const valid = Array.isArray(trufadasStock)
      && TRUFADA_STOCK_ITEM_KEYS.every(key => trufadasStock.filter(row =>
        row?.item_key === key && Number.isSafeInteger(row.available) && row.available >= 0,
      ).length === 1);
    stockChecked = Boolean(valid);
    for (const key of TRUFADA_STOCK_ITEM_KEYS) {
      const remaining = valid ? (trufadasStock as PublicTrufadasStockRow[]).find(row => row.item_key === key)!.available : 0;
      stockRemaining[key] = remaining;
      if (remaining === 0 && statuses[key] !== "hidden") statuses[key] = "sold_out";
    }
  }

  return {
    ordersOpen,
    statuses,
    stockRemaining,
    stockChecked,
    slicePreorder: verifiedPreorder,
    source: "supabase",
    loadedAt: Date.now(),
  };
}

export function statusFor(snapshot: AvailabilitySnapshot, itemKey: string): AvailabilityStatus {
  return snapshot.statuses[itemKey] ?? "available";
}

export function isItemVisible(snapshot: AvailabilitySnapshot, itemKey: string): boolean {
  return statusFor(snapshot, itemKey) !== "hidden";
}

export function isItemAvailable(snapshot: AvailabilitySnapshot, itemKey: string): boolean {
  return statusFor(snapshot, itemKey) === "available";
}

export function categoryItemKey(category: CategoryId): string {
  return CATEGORY_ITEM_KEYS[category];
}

export function categoryForItem(item: MenuAvailabilityItem): CategoryId {
  return item.categoryKey === CATEGORY_ITEM_KEYS.cones ? "cones"
    : item.categoryKey === CATEGORY_ITEM_KEYS.natal ? "natal"
    : item.categoryKey === CATEGORY_ITEM_KEYS.pipocas ? "pipocas" : "fatias";
}
