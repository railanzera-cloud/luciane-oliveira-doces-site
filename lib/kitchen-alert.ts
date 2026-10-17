// Seleção pura: o alerta é por novo pedido, sem alterar sua situação no banco.
export const KITCHEN_ALERT_REPEAT_MS = 8000;
export const KITCHEN_ALERT_LOOKBACK_MS = 8 * 60 * 60 * 1000;

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
  acknowledged: ReadonlySet<string>,
  now = Date.now(),
): KitchenAlertOrder[] {
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return [];
  return orders.filter(order => {
    const when = Date.parse(order.created_at);
    return Number.isFinite(when) && when >= activatedAt && when <= now
      && now - when <= KITCHEN_ALERT_LOOKBACK_MS
      && !acknowledged.has(order.id)
      && ["new","confirmed","preparing","ready","ready_for_pickup","out_for_delivery"].includes(order.order_status)
      && !["failed","cancelled","refunded"].includes(order.payment_status);
  });
}

// Toque de 3 notas + resposta, com envelope gradual para evitar estalos.
// Exige AudioContext desbloqueado por interação do operador.
export function playKitchenChime(context: AudioContext, level: "normal" | "alto" = "alto"): void {
  if (context.state !== "running") return;
  const volume = level === "alto" ? 0.25 : 0.13;
  const now = context.currentTime + 0.012;
  const frequencies = [784, 988, 1175, 988];
  frequencies.forEach((frequency, index) => {
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
