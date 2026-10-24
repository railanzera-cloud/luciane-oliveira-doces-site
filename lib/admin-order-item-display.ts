import type { AdminOrderItem } from "./admin-orders-client";

/**
 * Texto SOMENTE para o painel de Pedidos. Não modifica os itens no Supabase,
 * o preço, o pedido do cliente ou a comanda enviada à impressora.
 */
export function formatAdminOrderItem(
  item: Pick<AdminOrderItem, "name" | "size_label" | "quantity" | "option_names">,
): { title: string; detail: string | null } {
  const options = item.option_names?.length ? item.option_names.join(" + ") : null;
  const isSingleSliceVariant = item.size_label?.trim().toLocaleLowerCase("pt-BR") === "1 fatia";

  if (isSingleSliceVariant) {
    // O nome completo continua intacto no banco/WhatsApp/comanda.
    const displayName = item.name === "Coco cremoso com geleia de morango na massa branca"
      ? "Coco Cremoso com Morango"
      : item.name;
    const quantityLabel = `${item.quantity} ${item.quantity === 1 ? "fatia" : "fatias"}`;
    return {
      title: `${item.quantity}x ${displayName}`,
      detail: options ? `${quantityLabel} · ${options}` : quantityLabel,
    };
  }

  // Pipocas, refrigerantes e outros produtos seguem EXATAMENTE como antes.
  return {
    title: `${item.quantity}x ${item.name}${item.size_label ? ` — ${item.size_label}` : ""}`,
    detail: options,
  };
}
