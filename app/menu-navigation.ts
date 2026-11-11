import { STORE_CONFIG, type CategoryId } from "@/app/catalog";
import { CATEGORY_ITEM_KEYS, isItemAvailable, isItemVisible, type AvailabilitySnapshot } from "@/app/menu-availability";

export const MENU_CATEGORIES = [
  { id: "cones", name: "Cones Trufados", description: "Prestígio, Dois Amores e Ferrero Rocher" },
  { id: "pipocas", name: "Pipocas Gourmet", description: "Escolha o tamanho e combine seus sabores" },
  { id: "fatias", name: "Fatias Artesanais", description: "Escolha entre os sabores disponíveis" },
] as const;

export function publicCategories(snapshot: AvailabilitySnapshot) {
  return MENU_CATEGORIES.filter(({ id }) => STORE_CONFIG.enabledCategories[id]
    && isItemVisible(snapshot, CATEGORY_ITEM_KEYS[id]));
}

export function categoryFromUrl(href: string): CategoryId | null {
  const category = new URL(href).searchParams.get("categoria");
  if (category === "trufadas") return "pipocas";
  return category === "pipocas" || category === "fatias" || category === "cones" || category === "natal" ? category : null;
}

// Aceita links compartilháveis e entradas de histórico das versões anteriores.
export function trufadasFromUrl(href: string, state: { lucianeCrocante?: boolean } | null) {
  const category = new URL(href).searchParams.get("categoria");
  return category === "trufadas" || (category === "pipocas" && state?.lucianeCrocante === true);
}

export function resolveMenuCategory(snapshot: AvailabilitySnapshot, requested: CategoryId | null): CategoryId | null {
  const visible = publicCategories(snapshot);
  if (requested === "natal" && isItemVisible(snapshot, CATEGORY_ITEM_KEYS.natal)) return requested;
  if (requested && visible.some(({ id }) => id === requested)
    && isItemAvailable(snapshot, CATEGORY_ITEM_KEYS[requested])) return requested;

  // Uma única categoria publicada não precisa de uma confirmação extra.
  if (visible.length === 1 && isItemAvailable(snapshot, CATEGORY_ITEM_KEYS[visible[0].id])) return visible[0].id;
  return null;
}

export function categoryUrl(href: string, category: CategoryId | "trufadas" | null) {
  const url = new URL(href);
  if (category) url.searchParams.set("categoria", category);
  else url.searchParams.delete("categoria");
  return `${url.pathname}${url.search}${url.hash}`;
}
