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
  loadAdminTintimTracking,
  requestOrderEffects,
  transitionAdminOrder,
  type AdminOrder,
} from "@/lib/admin-orders-client";

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
  const [printerReady, setPrinterReady] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printerTested, setPrinterTested] = useState(false);
  const [printGateEnabled, setPrintGateEnabled] = useState(false);
  const [printing, setPrinting] = useState(false);
  const knownActionableRef = useRef(new Set<string>());
  const initializedRef = useRef(false);
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
      const { drainPrintQueue } = await import("@/lib/qz-print-client");
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
    const sequence = ++loadSequenceRef.current;
    setLoading(true);
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
      const actionableIds = nextOrders.filter(actionable).map((order) => order.id);
      if (!initializedRef.current) {
        actionableIds.forEach((id) => knownActionableRef.current.add(id));
        initializedRef.current = true;
      } else {
        const hasNew = actionableIds.some((id) => !knownActionableRef.current.has(id));
        actionableIds.forEach((id) => knownActionableRef.current.add(id));
        if (hasNew) playAlert();
      }
      setOrders(ordersWithTracking);
      if (printerReady) window.setTimeout(() => void processPrints(), 0);
    } catch (loadError) {
      if (sequence === loadSequenceRef.current) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os pedidos.");
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [client, playAlert, printerReady, processPrints, searchedNumber]);

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

  // O Realtime pode perder eventos durante suspensão/reconexão: polling seguro
  // em primeiro plano complementa a fila com gate no servidor.
  useEffect(() => {
    if (!printerReady) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void processPrints();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [printerReady, processPrints]);

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
      const context = getAudioContext();
      await context.resume();
      if (context.state !== "running") throw new Error("Audio suspended");
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
    setPrinterTested(false);
    try {
      const { connectKitchenPrinter, kitchenPrintIsEnabled } = await import("@/lib/qz-print-client");
      // Conectar hardware NÃO pode consumir a fila de impressão implicitamente.
      // O controle remoto permanece desligado até a homologação física.
      const printer = await connectKitchenPrinter(client);
      const enabled = await kitchenPrintIsEnabled(client);
      setPrinterName(printer);
      setPrinterReady(true);
      setPrintGateEnabled(enabled);
      setNotice(enabled
        ? `Impressora conectada: ${printer}. Fila protegida ativa; aguardando comandas elegíveis.`
        : `Impressora conectada: ${printer}. Impressão automática desativada com segurança.`);
    } catch (printerError) {
      setError(printerError instanceof Error ? printerError.message : "Não foi possível conectar ao QZ Tray.");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }

  async function printLocalTest() {
    if (!printerReady || printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    setError("");
    try {
      const { testKitchenPrinter } = await import("@/lib/qz-print-client");
      await testKitchenPrinter();
      setPrinterTested(true);
      setNotice("Teste enviado para a POS-58. Confira fisicamente o papel antes de ativar a fila.");
    } catch (testError) {
      setPrinterTested(false);
      setError(testError instanceof Error ? testError.message : "O teste de impressão falhou.");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }

  async function togglePrintAutomation() {
    if (!printerReady || printingRef.current) return;
    const next = !printGateEnabled;
    if (next && !printerTested) {
      setError("Faça e confira a impressão local antes de ativar a fila automática.");
      return;
    }
    if (!window.confirm(next
      ? "O teste local saiu corretamente no papel da POS-58? Ativar a impressão SOMENTE de novos pedidos elegíveis? A fila antiga será ignorada."
      : "Pausar a impressão automática da cozinha?")) return;
    printingRef.current = true;
    setPrinting(true);
    setError("");
    try {
      const { data, error } = await client.rpc("admin_set_kitchen_print_enabled", { p_enabled: next });
      if (error || !data || typeof data !== "object" || (data as { enabled?: unknown }).enabled !== next)
        throw new Error("Servidor não confirmou a mudança. Impressão não foi ativada.");
      setPrintGateEnabled(next);
      setNotice(next
        ? "Impressão automática ativada apenas para pedidos novos e elegíveis."
        : "Impressão automática pausada.");
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : "Não foi possível alterar a impressão.");
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
        <Button type="button" variant={alertsEnabled ? "default" : "outline"} onClick={() => void enableAlerts()}><BellRing size={17} /> {alertsEnabled ? "Alertas ativados" : alertsPreferred ? "Reativar alertas" : "Ativar alertas da cozinha"}</Button>
        <Button type="button" variant={printerReady ? "default" : "outline"} onClick={() => printerReady ? void processPrints() : void enablePrinter()} disabled={printing}>{printing ? <LoaderCircle className="admin-spinner" size={17} /> : <Printer size={17} />} {printerReady ? printerName || "Processar impressão" : "Conectar impressão 58 mm"}</Button>
        {printerReady && <Button type="button" variant="outline" onClick={() => void printLocalTest()} disabled={printing}><Printer size={17} /> Imprimir teste local</Button>}
        {printerReady && <Button type="button" variant={printGateEnabled ? "default" : "outline"} onClick={() => void togglePrintAutomation()} disabled={printing || (!printGateEnabled && !printerTested)}>{printGateEnabled ? "Pausar impressão automática" : "Ativar impressão automática"}</Button>}
        {printerReady && !printGateEnabled && !printerTested && <small role="status">Imprima o teste local e confira o papel para habilitar a ativação.</small>}
        {printerReady && printerTested && !printGateEnabled && <small role="status">Teste enviado. Confira fisicamente o papel antes de ativar a fila.</small>}
        {printerReady && printGateEnabled && <small role="status">Fila automática ligada — somente pedidos elegíveis posteriores à ativação.</small>}
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
