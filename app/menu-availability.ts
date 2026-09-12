import {
  POPCORN,
  SLICES,
  STORE_CONFIG,
  type CategoryId,
} from "@/app/catalog";

export const AVAILABILITY_STATUSES = ["available", "sold_out", "hidden"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];
export type AvailabilityItemType = "category" | "popcorn_size" | "popcorn_flavor" | "slice";

export type MenuAvailabilityItem = {
  itemKey: string;
  name: string;
  itemType: AvailabilityItemType;
  categoryKey: string;
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

export type AvailabilitySnapshot = {
  ordersOpen: boolean;
  statuses: Record<string, AvailabilityStatus>;
  source: "fallback" | "supabase";
  loadedAt: number;
};

export const CATEGORY_ITEM_KEYS: Record<CategoryId, string> = {
  pipocas: "category_pipocas",
  fatias: "category_fatias",
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

export const SLICE_ITEM_KEYS: Record<string, string> = {
  "fatia-chocolate-morango": "slice_chocolate_morango",
  "fatia-ninho-morango": "slice_ninho_morango",
  "fatia-prestigio": "slice_prestigio",
  "fatia-chocolate-maracuja": "slice_chocolate_maracuja",
  "fatia-chocolatudo": "slice_chocolatudo",
  "fatia-chocolate-cenoura": "slice_chocolate_cenoura",
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

const SLICE_ITEMS: MenuAvailabilityItem[] = SLICES.map((slice) => ({
  itemKey: SLICE_ITEM_KEYS[slice.id],
  name: slice.subtitle ? `${slice.name} — ${slice.subtitle}` : slice.name,
  itemType: "slice",
  categoryKey: CATEGORY_ITEM_KEYS.fatias,
}));

export const MENU_AVAILABILITY_ITEMS: MenuAvailabilityItem[] = [
  ...CATEGORY_ITEMS,
  ...POPCORN_SIZE_ITEMS,
  ...POPCORN_FLAVOR_ITEMS,
  ...SLICE_ITEMS,
];

const KNOWN_ITEM_KEYS = new Set(MENU_AVAILABILITY_ITEMS.map((item) => item.itemKey));

function staticStatus(available: boolean): AvailabilityStatus {
  return available ? "available" : "sold_out";
}

export function createFallbackAvailability(): AvailabilitySnapshot {
  const statuses: Record<string, AvailabilityStatus> = {
    [CATEGORY_ITEM_KEYS.pipocas]: STORE_CONFIG.enabledCategories.pipocas ? "available" : "hidden",
    [CATEGORY_ITEM_KEYS.fatias]: STORE_CONFIG.enabledCategories.fatias ? "available" : "hidden",
  };

  for (const variant of POPCORN.variants) {
    statuses[POPCORN_SIZE_ITEM_KEYS[variant.id]] = staticStatus(POPCORN.available && variant.available);
  }
  for (const option of POPCORN.options) {
    statuses[POPCORN_FLAVOR_ITEM_KEYS[option.id]] = staticStatus(POPCORN.available && option.available);
  }
  for (const slice of SLICES) {
    statuses[SLICE_ITEM_KEYS[slice.id]] = staticStatus(Boolean(slice.available && slice.variants[0]?.available));
  }

  return {
    ordersOpen: STORE_CONFIG.acceptingOrders,
    statuses,
    source: "fallback",
    loadedAt: Date.now(),
  };
}

export function mergeRemoteAvailability(
  rows: MenuAvailabilityRow[],
  ordersOpen: boolean,
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

  return {
    ordersOpen,
    statuses,
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
  return item.categoryKey === CATEGORY_ITEM_KEYS.pipocas ? "pipocas" : "fatias";
}
