// Avisos da cozinha: som curto por lote; falhas da impressora usam tom distinto.
export const KITCHEN_ALERT_REPEAT_MS = 5000; // segundo toque normal, uma única vez
export const KITCHEN_ALERT_VISIBLE_MS = 12000;
export const KITCHEN_ALERT_GROUP_MS = 10000;
export const KITCHEN_ALERT_LOOKBACK_MS = 15 * 60 * 1000;

export type KitchenAlertOrder = {
  id: string;
  order_number: number;
  created_at: string;
  sales_channel: string;
  payment_status: string;
  order_status: string;
};

export function pendingKitchenAlerts(
  orders: readonly KitchenAlertOrder[],
  activatedAt: number,
  notified: ReadonlySet<string>,
  now = Date.now(),
): KitchenAlertOrder[] {
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return [];
  return orders.filter(order => {
    const created = Date.parse(order.created_at);
    return Number.isFinite(created) && created >= activatedAt && created <= now
      && now - created <= KITCHEN_ALERT_LOOKBACK_MS
      && !notified.has(order.id)
      && ["new","confirmed","preparing","ready","ready_for_pickup","out_for_delivery"].includes(order.order_status)
      && !["failed","cancelled","refunded"].includes(order.payment_status);
  });
}

export function playKitchenChime(context: AudioContext, level: "normal" | "alto" = "alto"): void {
  if (context.state !== "running") return;
  const volume = level === "alto" ? 0.25 : 0.13;
  const now = context.currentTime + 0.012;
  [784, 988, 1175, 988].forEach((frequency, index) => {
    const start = now + index * 0.23;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.025);
    gain.gain.setValueAtTime(volume, start + 0.13);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.225);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
}

/** Som diferente de uma chegada comum; limitado pelo ganho e volume do Windows. */
export function playKitchenErrorChime(context: AudioContext, level: "normal" | "alto" = "alto"): void {
  if (context.state !== "running") return;
  const volume = level === "alto" ? 0.23 : 0.12;
  const now = context.currentTime + 0.01;
  [440, 330, 440].forEach((frequency, index) => {
    const start = now + index * 0.33;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.27);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
}
