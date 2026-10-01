import { lastOrderToken, loadPublicOrderStatus, LAST_ORDER_KEY, type PublicOrderStatus } from "@/lib/site-order";

const ACTIVE_STATUSES = new Set<PublicOrderStatus["order_status"]>([
  "payment_pending", "new", "confirmed", "preparing", "ready", "ready_for_pickup", "out_for_delivery",
]);
// Device recovery is offered for six hours; individual token URLs have no new expiry.
export const HOME_LAST_ORDER_WINDOW_MS = 6 * 60 * 60 * 1000;
export type HomeLastOrder = { token: string; number: number; expiresAt: number };

// This only invalidates device recovery; the individual URL and database order remain intact.
export function clearHomeLastOrder(token: string) {
  try {
    if (lastOrderToken() === token) window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch { /* Storage may be unavailable in private/in-app browsing. */ }
}
const device = { read: lastOrderToken, load: loadPublicOrderStatus, clear: clearHomeLastOrder };

export async function resolveHomeLastOrder(source = device, now = Date.now): Promise<HomeLastOrder | null> {
  const token = source.read();
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  try {
    const order = await source.load(token);
    // A response for an older order must not clear or display over a newer reference.
    if (source.read() !== token) return null;
    if (order.order_status === "completed" || order.order_status === "cancelled") {
      source.clear(token);
      return null;
    }
    const createdAt = Date.parse(order.created_at);
    const expiresAt = createdAt + HOME_LAST_ORDER_WINDOW_MS;
    const currentTime = now();
    if (!Number.isFinite(createdAt) || createdAt > currentTime) return null;
    if (currentTime >= expiresAt) {
      source.clear(token);
      return null;
    }
    return ACTIVE_STATUSES.has(order.order_status) ? { token, number: order.order_number, expiresAt } : null;
  } catch {
    // Do not discard the token on a temporary network failure or show unverified status.
    return null;
  }
}
