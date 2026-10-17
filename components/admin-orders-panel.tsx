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
  KITCHEN_ALERT_REPEAT_MS, pendingKitchenAlerts, playKitchenChime,
  type KitchenAlertOrder,
} from "@/lib/kitchen-alert";
import {
  loadKitchenAutoMode, setKitchenAutoMode, setKitchenPrintQueue,
  type KitchenAutoMode,
} from "@/lib/kitchen-auto-client";
import {
  confirmOfflinePayment,
  createReprint,
  loadAdminOrders,
  loadAdminTintimTracking,
  requestOrderEffects,
  transitionAdminOrder,
  type AdminOrder,
} from "@/lib/admin-orders-client";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ALERT_PREFERENCE_KEY = "lod-kitchen-alerts-enabled";
const ALERT_STARTED_KEY = "lod-kitchen-alerts-start-v2";
const ALERT_ACK_KEY = "lod-kitchen-alerts-acknowledged-v2";
const ALERT_VOLUME_KEY = "lod-kitchen-alerts-volume-v2";

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
  if (order.card_mode) return `${order.payment_status === "paid" ? "Pago" : "Pendente"} — ${order.card_mode === "credit_single" ? "Crédito à vista (1x)" : "Débito"}`;
  if (order.payment_method === "manual_pix") return order.payment_status === "paid" ? "Pago — Pix manual" : "Pix manual — aguardando conferência";
  if (order.payment_method === "mercado_pago_pix") return order.payment_status === "paid" ? "Pago — Pix" : "Pix online pendente";
  if (order.payment_method === "mercado_pago_card") return order.payment_status === "paid" ? "Pago — Cartão online" : "Cartão online pendente";
  if (order.payment_status === "paid") return "Pago — " + (order.payment_method === "cash" ? "Dinheiro" : "Cartão");
  if (order.payment_method === "cash") return `Dinheiro na ${order.fulfillment_type === "pickup" ? "retirada" : "entrega"}`;
  return `Cartão na ${order.fulfillment_type === "pickup" ? "retirada" : "entrega"}`;
}

// Esses dados são observações do site; não presumem campanha publicitária nem venda atribuída.
function visitParameter(order: AdminOrder, touch: "first_touch" | "current_visit", key: string): string | null {
  const entry = order.attribution_snapshot?.[touch];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const params = (entry as { parameters?: Record<string, unknown> }).parameters;
  const value = params?.[key];
  return Array.isArray(value) && typeof value[0] === "string" && value[0].trim()
    ? value[0].trim() : null;
}

function readableSource(source: string | null): string {
  if (!source) return "Não identificada";
  switch (source.toLowerCase()) {
    case "ig": case "instagram": return "Instagram";
    case "fb": case "facebook": return "Facebook";
    case "google": return "Google";
    case "whatsapp": case "wa": return "WhatsApp";
    default: return source;
  }
}

function visitOrigin(source: string | null, content: string | null): string {
  const label = readableSource(source);
  if (content?.toLowerCase() === "link_in_bio") return label === "Não identificada" ? "Link da bio" : `${label} (link da bio)`;
  return label;
}

type ObservedMarketingInteraction = {
  observed_at: string;
  evidence: "url_parameters";
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  ad_id?: string;
  has_fbclid?: boolean;
};

function marketingHistory(order: AdminOrder): ObservedMarketingInteraction[] {
  const raw = order.attribution_snapshot?.marketing_interactions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ObservedMarketingInteraction =>
    !!item && typeof item === "object" && item.evidence === "url_parameters"
    && typeof item.observed_at === "string" && Number.isFinite(Date.parse(item.observed_at)));
}

function interactionLabel(item: ObservedMarketingInteraction): string {
  return visitOrigin(item.utm_source ?? null, item.utm_content ?? null);
}

function interactionTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Belem", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionable(order: AdminOrder) {
  return !["payment_pending", "completed", "cancelled"].includes(order.order_status)
    && (!(order.payment_method === "mercado_pago_pix" || order.payment_method === "mercado_pago_card") || order.payment_status === "paid");
}

function nextAction(order: AdminOrder): { label: string; status: AdminOrder["order_status"]; icon: typeof ChefHat } | null {
  if (!actionable(order)) return null;
  if (order.sales_channel === "whatsapp" && order.order_status === "new") return { label: "Aceitar pedido", status: "confirmed", icon: Check };
  if (order.order_status === "new" || order.order_status === "confirmed") return { label: "Iniciar preparo", status: "preparing", icon: ChefHat };
  if (order.order_status === "preparing") return order.fulfillment_type === "pickup" ? { label: "Pronto para retirada", status: "ready_for_pickup", icon: PackageCheck } : { label: "Saiu para entrega", status: "out_for_delivery", icon: Truck };
  if (order.order_status === "ready" && order.fulfillment_type === "pickup") return { label: "Pronto para retirada", status: "ready_for_pickup", icon: ShoppingBag };
  if (order.order_status === "ready" && order.fulfillment_type === "delivery") return { label: "Saiu para entrega", status: "out_for_delivery", icon: Truck };
  if (order.order_status === "ready_for_pickup" || order.order_status === "out_for_delivery") return { label: "Concluir pedido", status: "completed", icon: Check };
  return null;
}

export function AdminOrdersPanel({ client, session }: { client: SupabaseClient; session: Session }) {
  const [numberInput, setNumberInput] = useState("");
  const [searchedNumber, setSearchedNumber] = useState<number | undefined>(undefined);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [realtimeState, setRealtimeState] = useState("Conectando…");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertsPreferred, setAlertsPreferred] = useState(false);
  const [alertVolume, setAlertVolume] = useState<"normal" | "alto">("alto");
  const [pendingAlertOrders, setPendingAlertOrders] = useState<KitchenAlertOrder[]>([]);
  const [kitchenMode, setKitchenMode] = useState<KitchenAutoMode | null>(null);
  const [kitchenModeBusy, setKitchenModeBusy] = useState(false);
  const [kitchenModeError, setKitchenModeError] = useState("");
  const [printerReady, setPrinterReady] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printing, setPrinting] = useState(false);
  const acknowledgedAlertsRef = useRef(new Set<string>());
  const alertStartedAtRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const printingRef = useRef(false);
  const effectsRunningRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const manualRefreshRef = useRef(false);
  async function manualRefresh() {
    if (manualRefreshRef.current) return;
    manualRefreshRef.current = true;
    try { await reload(); } finally { manualRefreshRef.current = false; }
  }


  const getAudioContext = useCallback(() => {
    const context = audioRef.current ?? createAudioContext();
    audioRef.current = context;
    context.onstatechange = () => setAlertsEnabled(context.state === "running");
    return context;
  }, []);

  const processEffects = useCallback(async () => {
    if (effectsRunningRef.current || document.visibilityState !== "visible") return;
    effectsRunningRef.current = true;
    try { await requestOrderEffects(session.access_token); }
    catch { /* Payment remains saved; the durable outbox retains the failure. */ }
    finally { effectsRunningRef.current = false; }
  }, [session.access_token]);

  const playAlert = useCallback(() => {
    const context = audioRef.current;
    if (!alertsEnabled || !context || context.state !== "running") return;
    playKitchenChime(context, alertVolume);
  }, [alertsEnabled, alertVolume]);

  const pendingAlertKey = pendingAlertOrders.map(order => order.id).join(",");
  useEffect(() => {
    if (!alertsEnabled || !pendingAlertKey) return;
    playAlert();
    const interval = window.setInterval(playAlert, KITCHEN_ALERT_REPEAT_MS);
    return () => window.clearInterval(interval);
  }, [alertsEnabled, pendingAlertKey, playAlert]);

  function acknowledgeKitchenAlerts() {
    if (!pendingAlertOrders.length) return;
    pendingAlertOrders.forEach(order => acknowledgedAlertsRef.current.add(order.id));
    try {
      window.localStorage.setItem(ALERT_ACK_KEY,
        JSON.stringify([...acknowledgedAlertsRef.current].slice(-400)));
    } catch { /* A confirmação desta sessão ainda interrompe o som. */ }
    setPendingAlertOrders([]);
    setNotice("Aviso recebido. Os pedidos continuam disponíveis no painel.");
  }

  const processPrints = useCallback(async () => {
    if (!printerReady || printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    try {
      const { ensureKitchenPrinterConnected, drainPrintQueue } = await import("@/lib/qz-print-client");
      await ensureKitchenPrinterConnected(session.access_token);
      const count = await drainPrintQueue(client);
      if (count > 0) setNotice(`${count} ${count === 1 ? "comanda impressa" : "comandas impressas"}.`);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "A impressão falhou. O pedido continua salvo.");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }, [client, printerReady, session.access_token]);

  const reload = useCallback(async (silent = false) => {
    const sequence = ++loadSequenceRef.current;
    if (!silent) setLoading(true);
    setError("");
    try {
      const nextOrders = await loadAdminOrders(client, searchedNumber);
      // A mensuração é auxiliar: falha da consulta nunca bloqueia a cozinha.
      let ordersWithTracking = nextOrders;
      try {
        const tracking = await loadAdminTintimTracking(client, nextOrders);
        ordersWithTracking = nextOrders.map(order => ({ ...order, tintim_tracking: tracking.get(order.id) ?? null }));
        if (sequence === loadSequenceRef.current) setTrackingError("");
      } catch {
        if (sequence === loadSequenceRef.current) setTrackingError("Mensuração do Tintim indisponível; pedidos preservados.");
      }
      if (sequence !== loadSequenceRef.current) return;
      if (searchedNumber === undefined) {
        setPendingAlertOrders(pendingKitchenAlerts(
          nextOrders, alertStartedAtRef.current, acknowledgedAlertsRef.current,
        ));
      }
      setOrders(ordersWithTracking);
      if (printerReady) window.setTimeout(() => void processPrints(), 0);
    } catch (loadError) {
      if (sequence === loadSequenceRef.current) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os pedidos.");
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [client, printerReady, processPrints, searchedNumber]);

  useEffect(() => {
    let listening = false;
    const unlock = () => {
      try {
        const context = getAudioContext();
        void context.resume().then(() => setAlertsEnabled(context.state === "running")).catch(() => setAlertsEnabled(false));
      } catch { setAlertsEnabled(false); }
    };
    const timer = window.setTimeout(() => {
      let preferred = false;
      try { preferred = window.localStorage.getItem(ALERT_PREFERENCE_KEY) === "true"; }
      catch { /* Browser preferences are optional. */ }
      setAlertsPreferred(preferred);
      try {
        const started = Date.parse(window.localStorage.getItem(ALERT_STARTED_KEY) || "");
        if (Number.isFinite(started)) alertStartedAtRef.current = started;
        else if (preferred) {
          alertStartedAtRef.current = Date.now();
          window.localStorage.setItem(ALERT_STARTED_KEY, new Date(alertStartedAtRef.current).toISOString());
        }
        const saved = JSON.parse(window.localStorage.getItem(ALERT_ACK_KEY) || "[]");
        if (Array.isArray(saved)) acknowledgedAlertsRef.current = new Set(
          saved.filter((id): id is string => typeof id === "string").slice(-400));
        setAlertVolume(window.localStorage.getItem(ALERT_VOLUME_KEY) === "normal" ? "normal" : "alto");
      } catch { /* Preferências não devem bloquear pedidos. */ }
      if (!preferred) return;
      listening = true;
      document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (listening) document.removeEventListener("pointerdown", unlock, true);
    };
  }, [getAudioContext]);

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
    let active = true;
    void loadKitchenAutoMode(client).then(value => {
      if (active) { setKitchenMode(value); setKitchenModeError(""); }
    }).catch(err => { if (active) setKitchenModeError(err instanceof Error ? err.message : "Modo Cozinha indisponível."); });
    return () => { active = false; };
  }, [client]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void reload(), 0);
    // Realtime é imediato quando disponível; polling protege contra desconexões silenciosas.
    const fallback = window.setInterval(() => void reload(true), 20000);
    const printFallback = window.setInterval(() => {
      if (printerReady) void processPrints();
    }, 12000);
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
      window.clearInterval(fallback);
      window.clearInterval(printFallback);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
      void client.removeChannel(channel);
    };
  }, [client, printerReady, processPrints, reload]);

  async function enableAlerts() {
    try {
      const context = getAudioContext();
      await context.resume();
      if (context.state !== "running") throw new Error("Audio suspended");
      const freshActivation = !alertsPreferred || alertStartedAtRef.current === 0;
      if (freshActivation) {
        alertStartedAtRef.current = Date.now();
        acknowledgedAlertsRef.current.clear();
        setPendingAlertOrders([]);
      }
      setAlertsEnabled(true);
      setAlertsPreferred(true);
      try {
        window.localStorage.setItem(ALERT_PREFERENCE_KEY, "true");
        window.localStorage.setItem(ALERT_STARTED_KEY, new Date(alertStartedAtRef.current).toISOString());
        if (freshActivation) window.localStorage.setItem(ALERT_ACK_KEY, "[]");
      } catch { /* Áudio funciona mesmo sem armazenamento local. */ }
      playKitchenChime(context, alertVolume); // Teste real, após gesto do operador.
      setNotice("Som liberado. Mantenha este painel aberto no Windows.");
    } catch {
      setError("O navegador bloqueou o som. Toque novamente em ativar alertas.");
    }
  }

  async function pauseAlerts() {
    setAlertsPreferred(false);
    setPendingAlertOrders([]);
    try { window.localStorage.setItem(ALERT_PREFERENCE_KEY, "false"); }
    catch { /* opcional */ }
    try { await audioRef.current?.suspend(); } catch { /* browser lifecycle */ }
    setAlertsEnabled(false);
    setNotice("Alerta sonoro pausado. Pedidos e impressão continuam funcionando.");
  }

  async function toggleAutoMode(enabled: boolean) {
    if (enabled && !printerReady) {
      setKitchenModeError("Conecte a impressora 58 mm neste notebook antes de ativar o automático.");
      return;
    }
    if (enabled && !window.confirm(
      "Ativar cozinha automática? Novos pedidos do WhatsApp serão aceitos e entrarão na fila de impressão, mesmo com Pix pendente. O pagamento NÃO será confirmado. O estoque segue as regras atuais. Continuar?"
    )) return;
    setKitchenModeBusy(true);
    setKitchenModeError("");
    try {
      await setKitchenAutoMode(client, enabled);
      setKitchenMode(await loadKitchenAutoMode(client));
      setNotice(enabled ? "Modo automático ligado apenas para pedidos novos." : "Modo automático desligado; pedidos antigos preservados.");
    } catch (cause) {
      setKitchenModeError(cause instanceof Error ? cause.message : "Não foi possível mudar o modo.");
    } finally { setKitchenModeBusy(false); }
  }

  async function togglePrintQueue(enabled: boolean) {
    if (!enabled && !window.confirm(
      "Pausar a fila de impressão? Novas comandas não serão enviadas até você reativá-la. O histórico permanece intacto."
    )) return;
    setKitchenModeBusy(true);
    setKitchenModeError("");
    try {
      await setKitchenPrintQueue(client, enabled);
      setKitchenMode(await loadKitchenAutoMode(client));
      setNotice(enabled ? "Fila reativada só para novos trabalhos elegíveis." : "Impressões pausadas. Nenhum pedido foi apagado.");
    } catch (cause) {
      setKitchenModeError(cause instanceof Error ? cause.message : "Falha ao mudar a fila.");
    } finally { setKitchenModeBusy(false); }
  }

  async function enablePrinter() {
    printingRef.current = true;
    setPrinting(true);
    setError("");
    try {
      const { connectKitchenPrinter, drainPrintQueue } = await import("@/lib/qz-print-client");
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
      if (order.sales_channel === "site") void requestOrderEffects(session.access_token).catch(() => undefined);
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

  const visibleOrders = orders.filter((order) => searchedNumber !== undefined || (showHistory
    ? ["completed", "cancelled"].includes(order.order_status)
    : !["completed", "cancelled"].includes(order.order_status)));

  return (
    <section className="admin-orders-panel" aria-labelledby="admin-orders-title">
      <div className="admin-orders-heading">
        <div><p className="eyebrow">Cozinha</p><h1 id="admin-orders-title">Pedidos</h1><span className={`admin-live-state ${realtimeState === "Ao vivo" ? "is-live" : ""}`}>{realtimeState}</span></div>
        <Button type="button" variant="outline" onClick={() => void manualRefresh()} disabled={loading} aria-busy={loading}>{loading ? <LoaderCircle className="admin-spinner" size={16} /> : <RefreshCw size={16} />} {loading ? "Atualizando…" : "Atualizar"}</Button>
      </div>

      <div className="admin-kitchen-tools">
        <Button type="button" variant={alertsEnabled ? "default" : "outline"} onClick={() => void enableAlerts()}><BellRing size={17} /> {alertsEnabled ? "Testar som da cozinha" : alertsPreferred ? "Reativar alertas" : "Ativar alertas da cozinha"}</Button>
        {alertsPreferred && <Button type="button" variant="outline" onClick={() => void pauseAlerts()}>Pausar som</Button>}
        <Button type="button" variant={printerReady ? "default" : "outline"} onClick={() => printerReady ? void processPrints() : void enablePrinter()} disabled={printing}>{printing ? <LoaderCircle className="admin-spinner" size={17} /> : <Printer size={17} />} {printerReady ? printerName || "Processar impressão" : "Conectar impressão 58 mm"}</Button>
      </div>
      <div className="admin-kitchen-settings">
        <div className="admin-kitchen-settings-heading">
          <strong><BellRing size={18} /> Modo Cozinha</strong>
          <span>Som: <select aria-label="Volume do alerta" value={alertVolume}
            onChange={event => {
              const value = event.target.value === "normal" ? "normal" : "alto";
              setAlertVolume(value);
              try { window.localStorage.setItem(ALERT_VOLUME_KEY, value); } catch { /* opcional */ }
            }}>
            <option value="alto">Alto</option><option value="normal">Normal</option>
          </select></span>
        </div>
        <p>Deixe esta aba aberta no notebook Windows. O som toca novamente a cada 8 segundos
          até reconhecer o aviso. Para ouvir, clique em “Ativar alertas” uma vez após abrir o navegador.</p>
        {pendingAlertOrders.length > 0 && (
          <div className="admin-kitchen-incoming" role="alert" aria-live="assertive">
            <strong>🔔 {pendingAlertOrders.length} {pendingAlertOrders.length === 1 ? "pedido precisa de atenção" : "pedidos precisam de atenção"}</strong>
            <span>{pendingAlertOrders.slice(0, 5).map(order => `#${order.order_number}`).join(", ")}</span>
            <Button type="button" onClick={acknowledgeKitchenAlerts}>Reconhecer aviso e parar som</Button>
          </div>
        )}
        <div className="admin-kitchen-automation">
          <div><strong>Impressão automática de novos pedidos WhatsApp</strong>
            <small>{kitchenMode
              ? kitchenMode.enabled && kitchenMode.print_queue_enabled
                ? "Ligada — aceita pedidos novos e imprime sem confirmar o pagamento."
                : kitchenMode.enabled
                  ? "Suspensa — a fila de impressão está pausada."
                  : "Desligada — fluxo de confirmação manual preservado."
              : "Aguardando consulta do controle no Supabase."}</small></div>
          <Button type="button" variant={kitchenMode?.enabled ? "default" : "outline"}
            onClick={() => void toggleAutoMode(!kitchenMode?.enabled)}
            disabled={kitchenModeBusy || !kitchenMode}>
            {kitchenMode?.enabled ? "Desligar automático" : "Ligar automático"}
          </Button>
        </div>
        <div className="admin-kitchen-queue-controls">
          <span>Fila da impressora: <strong>{kitchenMode?.print_queue_enabled ? "Ligada" : "Pausada"}</strong></span>
          <Button type="button" variant="outline" disabled={kitchenModeBusy || !kitchenMode}
            onClick={() => void togglePrintQueue(!kitchenMode?.print_queue_enabled)}>
            {kitchenMode?.print_queue_enabled ? "Pausar impressão" : "Reativar impressão"}
          </Button>
        </div>
        {kitchenModeError && <p className="admin-kitchen-error" role="alert">{kitchenModeError}</p>}
        <small>Som depende do navegador e do volume do Windows. Fila e modo automático dependem do
          notebook ligado, navegador ativo, QZ Tray e impressora conectada. Pedidos pagos online só
          entram na fila após aprovação do Mercado Pago; Pix manual impresso pendente exige conferência.</small>
      </div>

      {notice && <div className="admin-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="admin-load-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

      <form className="admin-order-search" onSubmit={event => {
        event.preventDefault(); const raw = numberInput.trim().replace(/^#/, "");
        if (!raw) { setSearchedNumber(undefined); return; }
        const value = Number(raw);
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1) { setError("Informe um número de pedido válido."); return; }
        setSearchedNumber(value);
      }}><label htmlFor="order-number-search">Buscar pedido pelo número</label><input id="order-number-search" inputMode="numeric" placeholder="Ex.: 1047" value={numberInput} onChange={e => setNumberInput(e.target.value)} /><Button type="submit">Buscar</Button>{searchedNumber !== undefined && <Button variant="ghost" type="button" onClick={() => { setNumberInput(""); setSearchedNumber(undefined); }}>Ver todos</Button>}</form>
      <div className="admin-order-indicators" aria-label="Indicadores dos últimos 100 pedidos carregados">
        <span>Aguardando confirmação: <strong>{orders.filter(o => o.order_status === "new").length}</strong></span>
        <span>Em preparo: <strong>{orders.filter(o => o.order_status === "preparing").length}</strong></span>
        <span>Retirada / entrega: <strong>{orders.filter(o => ["ready", "ready_for_pickup", "out_for_delivery"].includes(o.order_status)).length}</strong></span>
        <small>{searchedNumber !== undefined ? "Resultado da busca" : "Últimos 100 pedidos carregados"}</small>
        {trackingError && <small role="status">{trackingError}</small>}
      </div>
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
            // Registro obtido na visita ao site, independente da campanha armazenada no Tintim.
            const priorCampaignVisit = marketingHistory(order).filter(touch => Boolean(touch.utm_campaign)).at(-1);
            const hasCampaignInCurrentVisit = Boolean(visitParameter(order, "current_visit", "utm_campaign"));
            return (
              <article className={`admin-order-card status-${order.order_status}`} key={order.id}>
                <header className="admin-order-card-heading">
                  <div><span className="admin-order-number">Pedido #{order.order_number}</span><time dateTime={order.created_at}><Clock3 size={14} /> {new Date(order.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>
                  <span className="admin-order-status">{order.sales_channel === "whatsapp" && order.order_status === "new" ? "Aguardando confirmação" : ORDER_LABELS[order.order_status]}</span>
                </header>
                <div className="admin-order-customer"><strong>{order.customer_name}</strong><span>{order.customer_phone}</span></div>
                <div className="admin-order-badges"><span>{order.fulfillment_type === "pickup" ? <ShoppingBag size={15} /> : <Truck size={15} />}{order.fulfillment_type === "pickup" ? "Retirada" : "Entrega"}</span><span className={order.payment_status === "paid" ? "is-paid" : "is-pay-later"}>{order.payment_method === "cash" ? <Banknote size={15} /> : <CreditCard size={15} />}{paymentLabel(order)}</span></div>
                <div className="admin-order-items">{order.order_items.map((item) => <div key={item.id}><strong>{item.quantity}x {item.name}{item.size_label ? ` — ${item.size_label}` : ""}</strong>{item.option_names?.length > 0 && <span>{item.option_names.join(" + ")}</span>}</div>)}</div>
                {order.fulfillment_type === "delivery" && <div className="admin-order-address"><MapPin size={16} /><span>{order.street}, {order.street_number}{order.complement ? ` — ${order.complement}` : ""}<br />{order.neighborhood}{order.reference ? ` · Ref.: ${order.reference}` : ""}</span></div>}
                {order.payment_method === "cash" && order.cash_change_for && <p className="admin-order-change">Troco para: <strong>{money.format(Number(order.cash_change_for))}</strong></p>}
                {order.notes && <p className="admin-order-change"><strong>Observação:</strong> {order.notes}</p>}
                <section className="admin-order-attribution" aria-label="Rastreamento do pedido">
                  <p className="admin-order-attribution-heading">Rastreamento deste pedido</p>
                  {order.tintim_tracking?.source_label && (
                    <p>Origem associada à conversa: <strong>{order.tintim_tracking.source_label} (Tintim)</strong></p>
                  )}
                  {order.tintim_tracking?.campaign_name && (
                    <p>
                      {order.tintim_tracking.campaign_evidence_kind === "historical_conversation"
                        ? "Campanha identificada anteriormente na conversa: "
                        : "Campanha registrada pelo Tintim próxima a este pedido: "}
                      <strong>{order.tintim_tracking.campaign_name}</strong>
                    </p>
                  )}
                  {order.tintim_tracking?.campaign_evidence_kind === "historical_conversation" &&
                    order.tintim_tracking.campaign_observed_at && (
                    <p className="admin-order-attribution-note">
                      Registrada em {interactionTime(order.tintim_tracking.campaign_observed_at)} — antes deste pedido.
                    </p>
                  )}
                  {order.tintim_tracking?.click_identifier_matches && (
                    <p className="admin-order-attribution-note">
                      O identificador de clique deste pedido coincide com o registro da campanha no Tintim.
                      {order.tintim_tracking?.campaign_evidence_kind === "historical_conversation"
                        ? " Ele pode ter sido preservado de uma interação anterior."
                        : ""}
                    </p>
                  )}
                  <p>Origem desta visita ao site: <strong>{visitOrigin(visitParameter(order, "current_visit", "utm_source"), visitParameter(order, "current_visit", "utm_content"))}</strong></p>
                  {visitParameter(order, "current_visit", "utm_campaign") && (
                    <p>Campanha identificada nesta visita: <strong>{visitParameter(order, "current_visit", "utm_campaign")}</strong></p>
                  )}
                  {!hasCampaignInCurrentVisit && priorCampaignVisit?.utm_campaign && (
                    <p className="admin-order-attribution-note">
                      Campanha identificada em outra visita: <strong>{priorCampaignVisit.utm_campaign}</strong>
                      {" "}({interactionTime(priorCampaignVisit.observed_at)}).
                    </p>
                  )}
                  {visitParameter(order, "first_touch", "utm_source") &&
                    visitParameter(order, "first_touch", "utm_source") !== visitParameter(order, "current_visit", "utm_source") && (
                    <p>Origem da primeira visita registrada: {readableSource(visitParameter(order, "first_touch", "utm_source"))}</p>
                  )}
                </section>
                {order.tintim_tracking && (
                  <details className="admin-order-attribution-details">
                    <summary>Mais informações do Tintim</summary>
                    <div className="admin-order-attribution-detail-body">
                      {order.tintim_tracking.adset_name &&
                        order.tintim_tracking.adset_name !== order.tintim_tracking.campaign_name && (
                        <p>Conjunto de anúncios: {order.tintim_tracking.adset_name}</p>
                      )}
                      {order.tintim_tracking.ad_name &&
                        order.tintim_tracking.ad_name !== order.tintim_tracking.campaign_name &&
                        order.tintim_tracking.ad_name !== order.tintim_tracking.adset_name && (
                        <p>Anúncio: {order.tintim_tracking.ad_name}</p>
                      )}
                      {order.tintim_tracking.match_basis === "order_reference" && (
                        <p>O número deste pedido foi identificado na mensagem da conversa.</p>
                      )}
                      <small>
                        Campanha preservada para este pedido: mudanças futuras na conversa não alteram este registro.
                        {" "}{order.tintim_tracking.match_status === "candidate"
                          ? "A associação com a conversa é provisória e independente do pagamento."
                          : "A conversa está associada ao pedido."}
                        {" "}{order.payment_status === "paid"
                          ? "O pagamento está registrado como confirmado no painel."
                          : "O pagamento ainda precisa ser confirmado separadamente no painel."}
                      </small>
                    </div>
                  </details>
                )}
                {marketingHistory(order).length > 0 && (
                  <details className="admin-order-attribution-details">
                    <summary>Histórico de visitas identificadas ({marketingHistory(order).length})</summary>
                    <div className="admin-order-attribution-detail-body">
                      <ol>
                        {marketingHistory(order).slice(-8).map((touch, index) => (
                          <li key={`${touch.observed_at}-${index}`}>
                            <strong>{interactionTime(touch.observed_at)}</strong> — {interactionLabel(touch)}
                            {touch.utm_campaign && <> · Campanha informada no link: {touch.utm_campaign}</>}
                          </li>
                        ))}
                      </ol>
                      <small>Inclui a visita atual quando identificada. O histórico não comprova uma compra causada por anúncio.</small>
                    </div>
                  </details>
                )}
                {order.payment_method === "card_on_delivery" && !order.card_mode && <p className="admin-order-change">Confira com o cliente qualquer acréscimo da maquininha antes de aceitar.</p>}
                {order.card_mode && <p className="admin-order-change">Acréscimo já incluído: {money.format(Number(order.card_fee))} ({Number(order.card_basis_points) / 100}%). Informe o total em “Valor da cobrança” da maquininha. Não acrescente outra tarifa.</p>}
                <p className="admin-order-change">Produtos: {money.format(Number(order.subtotal))} · Entrega: {money.format(Number(order.delivery_fee))}</p>
                <div className="admin-order-total"><span>Total</span><strong>{money.format(Number(order.total))}</strong></div>
                <div className="admin-order-actions">
                  {next && NextIcon && <Button type="button" onClick={() => void runOrderAction(order, next.status, `Pedido #${order.order_number}: ${next.label.toLowerCase()}.`)} disabled={pending}><NextIcon size={16} /> {next.label}</Button>}
                  {order.payment_status === "pending" && (order.payment_method === "cash" || order.payment_method === "card_on_delivery" || order.payment_method === "manual_pix") && <Button type="button" variant="outline" onClick={() => void confirmPayment(order)} disabled={pending}><Check size={16} /> Confirmar pagamento</Button>}
                  {order.sales_channel !== "whatsapp" && actionable(order) && <Button type="button" variant="outline" onClick={() => void reprint(order)} disabled={pending}><RotateCcw size={16} /> Reimprimir</Button>}
                  {!['completed', 'cancelled'].includes(order.order_status) && <Button type="button" variant="ghost" className="admin-cancel-order" onClick={() => void runOrderAction(order, "cancelled", `Pedido #${order.order_number} cancelado.`)} disabled={pending}><X size={16} /> Cancelar</Button>}
                </div>
              </article>
            );
          })}</div>}
    </section>
  );
}
