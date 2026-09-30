import { lastOrderToken, loadPublicOrderStatus, LAST_ORDER_KEY, type PublicOrderStatus } from "@/lib/site-order";

const ACTIVE_STATUSES = new Set<PublicOrderStatus["order_status"]>([
  "payment_pending", "new", "confirmed", "preparing", "ready", "ready_for_pickup", "out_for_delivery",
]);
export type HomeLastOrder = { token: string; number: number };

// This only invalidates device recovery; the individual URL and database order remain intact.
const device = {
  read: lastOrderToken,
  load: loadPublicOrderStatus,
  clear(token: string) {
    try {
      if (lastOrderToken() === token) window.localStorage.removeItem(LAST_ORDER_KEY);
    } catch { /* Storage may be unavailable in private/in-app browsing. */ }
  },
};

export async function resolveHomeLastOrder(source = device): Promise<HomeLastOrder | null> {
  const token = source.read();
  if (!token) return null;
  try {
    const order = await source.load(token);
    // A response for an older order must not clear or display over a newer reference.
    if (source.read() !== token) return null;
    if (order.order_status === "completed" || order.order_status === "cancelled") {
      source.clear(token);
      return null;
    }
    return ACTIVE_STATUSES.has(order.order_status) ? { token, number: order.order_number } : null;
  } catch {
    // Do not discard the token on a temporary network failure or show unverified status.
    return null;
  }
}
