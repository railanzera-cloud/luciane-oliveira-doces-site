import { STORE_CONFIG, type CategoryId } from "@/app/catalog";
import { CATEGORY_ITEM_KEYS, isItemAvailable, isItemVisible, type AvailabilitySnapshot } from "@/app/menu-availability";

export const MENU_CATEGORIES = [
  { id: "pipocas", name: "Pipocas Gourmet", description: "Escolha o tamanho e combine seus sabores" },
  { id: "fatias", name: "Fatias Artesanais", description: "Escolha entre os sabores disponíveis" },
] as const;

export function publicCategories(snapshot: AvailabilitySnapshot) {
  return MENU_CATEGORIES.filter(({ id }) => STORE_CONFIG.enabledCategories[id]
    && isItemVisible(snapshot, CATEGORY_ITEM_KEYS[id]));
}

export function categoryFromUrl(href: string): CategoryId | null {
  const category = new URL(href).searchParams.get("categoria");
  return category === "pipocas" || category === "fatias" ? category : null;
}

export function resolveMenuCategory(snapshot: AvailabilitySnapshot, requested: CategoryId | null): CategoryId | null {
  const visible = publicCategories(snapshot);
  if (requested && visible.some(({ id }) => id === requested)
    && isItemAvailable(snapshot, CATEGORY_ITEM_KEYS[requested])) return requested;

  // Uma única categoria publicada não precisa de uma confirmação extra.
  if (visible.length === 1 && isItemAvailable(snapshot, CATEGORY_ITEM_KEYS[visible[0].id])) return visible[0].id;
  return null;
}

export function categoryUrl(href: string, category: CategoryId | null) {
  const url = new URL(href);
  if (category) url.searchParams.set("categoria", category);
  else url.searchParams.delete("categoria");
  return `${url.pathname}${url.search}${url.hash}`;
}
