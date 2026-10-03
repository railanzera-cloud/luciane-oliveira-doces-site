"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock3, LoaderCircle, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DELIVERY_TIME_ESTIMATE } from "@/app/catalog";
import { formatOrderMoney } from "@/app/order-checkout";
import { lastOrderToken, rememberOrder, loadPublicOrderStatus, sitePaymentLabel, type PublicOrderStatus } from "@/lib/site-order";

import { TintimContactLink } from "@/components/tintim-contact-link";

const ORDER_LABELS: Record<PublicOrderStatus["order_status"], string> = {
  payment_pending: "Aguardando pagamento",
  new: "Aguardando confirmação",
  confirmed: "Pedido confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function OrderTrackingPage() {
  const [token] = useState(() => typeof window === "undefined"
    ? ""
    : new URL(window.location.href).searchParams.get("token")?.trim().toLowerCase() || lastOrderToken());
  const [order, setOrder] = useState<PublicOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyNotice, setCopyNotice] = useState("");
  const [error, setError] = useState("");

  const loadSequenceRef = useRef(0);
  const manualRefreshRef = useRef(false);
  async function manualRefresh() {
    if (manualRefreshRef.current) return;
    manualRefreshRef.current = true;
    try { await refresh(); } finally { manualRefreshRef.current = false; }
  }


  const refresh = useCallback(async (trackingToken = token) => {
    if (!trackingToken) return;
    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    try {
      const latest = await loadPublicOrderStatus(trackingToken);
      if (sequence !== loadSequenceRef.current) return;
      setOrder(latest);
      rememberOrder(trackingToken);
      setError("");
    } catch (loadError) {
      if (sequence === loadSequenceRef.current) setError(loadError instanceof Error ? loadError.message : "Não foi possível consultar o pedido.");
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!/^[0-9a-f]{48}$/.test(token)) {
        setError("Link do pedido inválido.");
        setLoading(false);
        return;
      }
      void refresh(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, token]);

  useEffect(() => {
    if (!token || !order || (order.order_status === "cancelled" || (order.order_status === "completed" && order.payment_status !== "pending"))) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5000);
    const focus = () => void refresh();
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); };
  }, [order, refresh, token]);

  const supportMessage = order
    ? `Olá! Já fiz o pedido #${order.order_number} pelo site e preciso de ajuda.`
    : undefined;

  return (
    <main className="tracking-page">
      <section className="tracking-card" aria-busy={loading}>
        <span className="tracking-icon" aria-hidden="true">{order?.order_status === "completed" ? <Check size={28} /> : <ShoppingBag size={27} />}</span>
        <p className="eyebrow">Detalhes do pedido</p>
        {loading && !order ? <><LoaderCircle className="admin-spinner" size={24} /><h1>Consultando pedido…</h1></> : error && !order ? <><h1>Não foi possível abrir</h1><p role="alert">{error}</p></> : order && <>
          <h1>Pedido #{order.order_number}</h1>
          <div className="tracking-current-status"><Clock3 size={19} aria-hidden="true" /><span><small>Último status informado pela loja</small><strong>{ORDER_LABELS[order.order_status]}</strong></span></div>
          <div className="tracking-details">
            <p><span>Pagamento informado</span><strong>{order.payment_status === "paid" ? "Pago" : order.payment_status === "pending" ? `Pendente — ${(order.card_mode ? order.card_mode === "credit_single" ? "Crédito à vista (1x)" : "Débito" : sitePaymentLabel(order.payment_method, order.fulfillment_type === "pickup" ? "retirada" : "entrega"))}` : order.payment_status === "refunded" ? "Devolvido" : "Não aprovado"}</strong></p>
            <p><span>Recebimento</span><strong>{order.fulfillment_type === "pickup" ? "Retirada" : "Entrega"}</strong></p>
          </div>
          <div className="tracking-details">
            {order.items?.map((item, index) => <div key={index}><strong>{item.quantity}x {item.name} {item.size_label}</strong>{item.option_names.length > 0 && <p>{item.option_names.join(" + ")}</p>}</div>)}
            {order.card_mode && <p><span>Acréscimo do cartão já incluído</span><strong>{formatOrderMoney(Number(order.card_fee))}</strong></p>}
            <p><span>Total</span><strong>{formatOrderMoney(Number(order.total))}</strong></p>
            <p><span>Atualização registrada</span><time dateTime={order.updated_at}>{new Date(order.updated_at).toLocaleString("pt-BR")}</time></p>
          </div>
          {!["completed", "cancelled"].includes(order.order_status) && <p>{order.fulfillment_type === "delivery" ? `${DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja.` : "O horário de retirada será combinado com a loja após a confirmação."}</p>}
          <p>Status e pagamento refletem as informações registradas pela loja. Para confirmar ou saber o andamento do pedido, fale com a loja pelo WhatsApp.</p>
          {error && <p className="site-result-notice" role="status">Não foi possível atualizar os detalhes. As informações anteriores foram mantidas.</p>}
        </>}
        <div className="tracking-actions">
          {order && <Button type="button" onClick={() => void manualRefresh()} disabled={loading} aria-busy={loading}>{loading ? <LoaderCircle className="admin-spinner" size={17} /> : <RefreshCw size={17} />} {loading ? "Atualizando…" : "Atualizar detalhes"}</Button>}
          {order && <><Button variant="outline" onClick={async () => {
            try { await navigator.clipboard.writeText(`${window.location.origin}/pedido?token=${token}`); setCopyNotice("Link copiado."); }
            catch { setCopyNotice("Selecione o link abaixo para copiar."); }
          }}>Copiar link do pedido</Button><input className="tracking-copy-field" aria-label="Link individual do pedido" readOnly value={typeof window === "undefined" ? "" : `${window.location.origin}/pedido?token=${token}`} onFocus={e => e.target.select()} />{copyNotice && <p role="status">{copyNotice}</p>}</>}
          <Button variant="outline" asChild><TintimContactLink message={supportMessage}><MessageCircle size={17} /> Falar com a loja</TintimContactLink></Button>
          <Button variant="ghost" asChild><Link href="/" onClick={() => {
            // A completed registration must not trap the customer on the handoff screen.
            try {
              const key = "luciane-order-session-v2";
              const saved = JSON.parse(window.sessionStorage.getItem(key) || "null");
              if (saved?.whatsappResult?.result?.order?.tracking_token === token) window.sessionStorage.removeItem(key);
            } catch { /* Navigation and the last tracking token remain available. */ }
          }}>Voltar ao cardápio</Link></Button>
        </div>
      </section>
    </main>
  );
}
