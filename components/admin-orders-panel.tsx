"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  Banknote,
  BellRing,
  Check,
  ChefHat,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Printer,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  confirmOfflinePayment,
  createReprint,
  loadAdminOrders,
  requestOrderEffects,
  transitionAdminOrder,
  type AdminOrder,
} from "@/lib/admin-orders-client";
import { connectKitchenPrinter, drainPrintQueue } from "@/lib/qz-print-client";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ALERT_PREFERENCE_KEY = "lod-kitchen-alerts-enabled";

function createAudioContext(): AudioContext {
  const Constructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) throw new Error("Áudio não suportado neste navegador.");
  return new Constructor();
}

const ORDER_LABELS: Record<AdminOrder["order_status"], string> = {
  payment_pending: "Aguardando pagamento",
  new: "Novo",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function paymentLabel(order: AdminOrder) {
  if (order.payment_method === "mercado_pago_pix") return order.payment_status === "paid" ? "Pago — Pix" : "Pix online pendente";
  if (order.payment_method === "mercado_pago_card") return order.payment_status === "paid" ? "Pago — Cartão online" : "Cartão online pendente";
  if (order.payment_method === "cash") return `Dinheiro na ${order.fulfillment_type === "pickup" ? "retirada" : "entrega"}`;
  return `Cartão na ${order.fulfillment_type === "pickup" ? "retirada" : "entrega"}`;
}

function actionable(order: AdminOrder) {
  return !["payment_pending", "completed", "cancelled"].includes(order.order_status)
    && (!(order.payment_method === "mercado_pago_pix" || order.payment_method === "mercado_pago_card") || order.payment_status === "paid");
}

function nextAction(order: AdminOrder): { label: string; status: AdminOrder["order_status"]; icon: typeof ChefHat } | null {
  if (!actionable(order)) return null;
  if (order.order_status === "new" || order.order_status === "confirmed") return { label: "Iniciar preparo", status: "preparing", icon: ChefHat };
  if (order.order_status === "preparing") return { label: "Marcar pronto", status: "ready", icon: PackageCheck };
  if (order.order_status === "ready" && order.fulfillment_type === "pickup") return { label: "Pronto para retirada", status: "ready_for_pickup", icon: ShoppingBag };
  if (order.order_status === "ready" && order.fulfillment_type === "delivery") return { label: "Saiu para entrega", status: "out_for_delivery", icon: Truck };
  if (order.order_status === "ready_for_pickup" || order.order_status === "out_for_delivery") return { label: "Concluir pedido", status: "completed", icon: Check };
  return null;
}

export function AdminOrdersPanel({ client, session }: { client: SupabaseClient; session: Session }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [realtimeState, setRealtimeState] = useState("Conectando…");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertsPreferred, setAlertsPreferred] = useState(false);
  const [printerReady, setPrinterReady] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printing, setPrinting] = useState(false);
  const knownActionableRef = useRef(new Set<string>());
  const initializedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const printingRef = useRef(false);
  const effectsRunningRef = useRef(false);

  const processEffects = useCallback(async () => {
    if (effectsRunningRef.current || document.visibilityState !== "visible") return;
    effectsRunningRef.current = true;
    try { await requestOrderEffects(session.access_token); }
    catch { /* Payment remains saved; the durable outbox retains the failure. */ }
    finally { effectsRunningRef.current = false; }
  }, [session.access_token]);

  const playAlert = useCallback(() => {
    const context = audioRef.current;
    if (!alertsEnabled || !context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.58);
  }, [alertsEnabled]);

  const processPrints = useCallback(async () => {
    if (!printerReady || printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    try {
      const count = await drainPrintQueue(client);
      if (count > 0) setNotice(`${count} ${count === 1 ? "comanda impressa" : "comandas impressas"}.`);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "A impressão falhou. O pedido continua salvo.");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }, [client, printerReady]);

  const reload = useCallback(async () => {
    setError("");
    try {
      const nextOrders = await loadAdminOrders(client);
      const actionableIds = nextOrders.filter(actionable).map((order) => order.id);
      if (!initializedRef.current) {
        actionableIds.forEach((id) => knownActionableRef.current.add(id));
        initializedRef.current = true;
      } else {
        const hasNew = actionableIds.some((id) => !knownActionableRef.current.has(id));
        actionableIds.forEach((id) => knownActionableRef.current.add(id));
        if (hasNew) playAlert();
      }
      setOrders(nextOrders);
      if (printerReady) window.setTimeout(() => void processPrints(), 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, [client, playAlert, printerReady, processPrints]);

  useEffect(() => {
    let listening = false;
    const unlock = () => {
      const context = audioRef.current ?? createAudioContext();
      audioRef.current = context;
      void context.resume().then(() => setAlertsEnabled(true)).catch(() => undefined);
    };
    const timer = window.setTimeout(() => {
      let preferred = false;
      try { preferred = window.localStorage.getItem(ALERT_PREFERENCE_KEY) === "true"; }
      catch { /* Browser preferences are optional. */ }
      setAlertsPreferred(preferred);
      if (!preferred) return;
      listening = true;
      document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (listening) document.removeEventListener("pointerdown", unlock, true);
    };
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void processEffects(), 0);
    const interval = window.setInterval(() => void processEffects(), 30000);
    const resume = () => void processEffects();
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [processEffects]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void reload(), 0);
    const channel = client.channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => { if (printerReady) void processPrints(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setRealtimeState("Ao vivo"); void reload(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeState("Reconectando…");
        else if (status === "CLOSED") setRealtimeState("Desconectado");
      });
    const focus = () => void reload();
    const visibility = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
      void client.removeChannel(channel);
    };
  }, [client, printerReady, processPrints, reload]);

  async function enableAlerts() {
    try {
      const context = audioRef.current ?? createAudioContext();
      audioRef.current = context;
      await context.resume();
      setAlertsEnabled(true);
      setAlertsPreferred(true);
      try { window.localStorage.setItem(ALERT_PREFERENCE_KEY, "true"); }
      catch { /* Audio can work even without a persisted preference. */ }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.06;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.12);
      setNotice("Alertas da cozinha ativados.");
    } catch {
      setError("O navegador bloqueou o som. Toque novamente em ativar alertas.");
    }
  }

  async function enablePrinter() {
    printingRef.current = true;
    setPrinting(true);
    setError("");
    try {
      const printer = await connectKitchenPrinter(session.access_token);
      setPrinterName(printer);
      setPrinterReady(true);
      const count = await drainPrintQueue(client);
      setNotice(count > 0
        ? `Impressão conectada: ${printer}. ${count} ${count === 1 ? "comanda impressa" : "comandas impressas"}.`
        : `Impressão conectada: ${printer}.`);
    } catch (printerError) {
      setError(printerError instanceof Error ? printerError.message : "Não foi possível conectar ao QZ Tray.");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }

  async function runOrderAction(order: AdminOrder, status: AdminOrder["order_status"], label: string) {
    if (status === "cancelled" && !window.confirm(`Cancelar o pedido #${order.order_number}? Essa ação não estorna pagamentos automaticamente.`)) return;
    setPendingId(order.id);
    setError("");
    try {
      await transitionAdminOrder(client, order.id, status);
      setNotice(label);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o pedido.");
    } finally { setPendingId(""); }
  }

  async function confirmPayment(order: AdminOrder) {
    if (!window.confirm(`Confirmar que o pagamento do pedido #${order.order_number} foi recebido?`)) return;
    setPendingId(order.id);
    setError("");
    try {
      await confirmOfflinePayment(client, order.id);
      setNotice(`Pagamento do pedido #${order.order_number} confirmado.`);
      void requestOrderEffects(session.access_token).catch(() => undefined);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível confirmar o pagamento.");
    } finally { setPendingId(""); }
  }

  async function reprint(order: AdminOrder) {
    setPendingId(order.id);
    setError("");
    try {
      await createReprint(client, order.id);
      setNotice(`Reimpressão do pedido #${order.order_number} adicionada à fila.`);
      if (printerReady) await processPrints();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível reimprimir.");
    } finally { setPendingId(""); }
  }

  const visibleOrders = orders.filter((order) => showHistory
    ? ["completed", "cancelled"].includes(order.order_status)
    : !["completed", "cancelled"].includes(order.order_status));

  return (
    <section className="admin-orders-panel" aria-labelledby="admin-orders-title">
      <div className="admin-orders-heading">
        <div><p className="eyebrow">Cozinha</p><h1 id="admin-orders-title">Pedidos</h1><span className={`admin-live-state ${realtimeState === "Ao vivo" ? "is-live" : ""}`}>{realtimeState}</span></div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}><RefreshCw size={16} /> Atualizar</Button>
      </div>

      <div className="admin-kitchen-tools">
        <Button type="button" variant={alertsEnabled ? "default" : "outline"} onClick={() => void enableAlerts()}><BellRing size={17} /> {alertsEnabled ? "Alertas ativados" : alertsPreferred ? "Reativar alertas" : "Ativar alertas da cozinha"}</Button>
        <Button type="button" variant={printerReady ? "default" : "outline"} onClick={() => printerReady ? void processPrints() : void enablePrinter()} disabled={printing}>{printing ? <LoaderCircle className="admin-spinner" size={17} /> : <Printer size={17} />} {printerReady ? printerName || "Processar impressão" : "Conectar impressão 58 mm"}</Button>
      </div>

      {notice && <div className="admin-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="admin-load-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

      <div className="admin-order-filters" role="group" aria-label="Lista de pedidos">
        <Button type="button" variant={!showHistory ? "default" : "ghost"} onClick={() => setShowHistory(false)}>Em andamento</Button>
        <Button type="button" variant={showHistory ? "default" : "ghost"} onClick={() => setShowHistory(true)}>Concluídos e cancelados</Button>
      </div>

      {loading && orders.length === 0 ? <div className="admin-orders-empty"><LoaderCircle className="admin-spinner" size={22} /> Carregando pedidos…</div>
        : visibleOrders.length === 0 ? <div className="admin-orders-empty"><ShoppingBag size={22} /><strong>{showHistory ? "Nenhum pedido no histórico." : "Nenhum pedido em andamento."}</strong></div>
          : <div className="admin-order-list">{visibleOrders.map((order) => {
            const next = nextAction(order);
            const NextIcon = next?.icon;
            const pending = pendingId === order.id;
            return (
              <article className={`admin-order-card status-${order.order_status}`} key={order.id}>
                <header className="admin-order-card-heading">
                  <div><span className="admin-order-number">Pedido #{order.order_number}</span><time dateTime={order.created_at}><Clock3 size={14} /> {new Date(order.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
                  <span className="admin-order-status">{ORDER_LABELS[order.order_status]}</span>
                </header>
                <div className="admin-order-customer"><strong>{order.customer_name}</strong><span>{order.customer_phone}</span></div>
                <div className="admin-order-badges"><span>{order.fulfillment_type === "pickup" ? <ShoppingBag size={15} /> : <Truck size={15} />}{order.fulfillment_type === "pickup" ? "Retirada" : "Entrega"}</span><span className={order.payment_status === "paid" ? "is-paid" : "is-pay-later"}>{order.payment_method === "cash" ? <Banknote size={15} /> : <CreditCard size={15} />}{paymentLabel(order)}</span></div>
                <div className="admin-order-items">{order.order_items.map((item) => <div key={item.id}><strong>{item.quantity}x {item.name}{item.size_label ? ` — ${item.size_label}` : ""}</strong>{item.option_names?.length > 0 && <span>{item.option_names.join(" + ")}</span>}</div>)}</div>
                {order.fulfillment_type === "delivery" && <div className="admin-order-address"><MapPin size={16} /><span>{order.street}, {order.street_number}{order.complement ? ` — ${order.complement}` : ""}<br />{order.neighborhood}{order.reference ? ` · Ref.: ${order.reference}` : ""}</span></div>}
                {order.payment_method === "cash" && order.cash_change_for && <p className="admin-order-change">Troco para: <strong>{money.format(Number(order.cash_change_for))}</strong></p>}
                <div className="admin-order-total"><span>Total</span><strong>{money.format(Number(order.total))}</strong></div>
                <div className="admin-order-actions">
                  {next && NextIcon && <Button type="button" onClick={() => void runOrderAction(order, next.status, `Pedido #${order.order_number}: ${next.label.toLowerCase()}.`)} disabled={pending}><NextIcon size={16} /> {next.label}</Button>}
                  {order.payment_status === "pending" && (order.payment_method === "cash" || order.payment_method === "card_on_delivery") && <Button type="button" variant="outline" onClick={() => void confirmPayment(order)} disabled={pending}><Check size={16} /> Confirmar pagamento</Button>}
                  {actionable(order) && <Button type="button" variant="outline" onClick={() => void reprint(order)} disabled={pending}><RotateCcw size={16} /> Reimprimir</Button>}
                  {!['completed', 'cancelled'].includes(order.order_status) && <Button type="button" variant="ghost" className="admin-cancel-order" onClick={() => void runOrderAction(order, "cancelled", `Pedido #${order.order_number} cancelado.`)} disabled={pending}><X size={16} /> Cancelar</Button>}
                </div>
              </article>
            );
          })}</div>}
    </section>
  );
}
