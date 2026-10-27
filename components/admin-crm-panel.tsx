"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, ChevronDown, Clock3, MessageCircle, RefreshCw, Search, ShieldCheck, UserPlus } from "lucide-react";
import { crmAdSliceHint, crmMentionedProductName, crmSuggestedMessage, crmWhatsAppLink, crmQueueBucket } from "@/lib/crm-follow-up";
import "./admin-crm-panel.css";

type Opportunity = {
  conversation_id: string;
  customer_name: string;
  phone_e164: string;
  consent_status: "unknown" | "granted" | "denied";
  commercial_opt_out: boolean;
  interest_label: string | null;
  status: "in_progress" | "waiting_customer" | "converted" | "lost" | "closed";
  source_label: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  follow_up_id: string | null;
  follow_up_due_at: string | null;
  follow_up_status: "pending" | "sent_manually" | "canceled" | null;
  created_at: string;
};
type Candidate = {
  tintim_id: string; contact_name: string; phone_hint: string;
  stage_label: string | null; source_label: string | null;
  campaign_name: string | null; last_seen_at: string; imported: boolean;
};
type View = "due" | "review" | "new" | "active" | "tintim";
type ProductMention = {
  conversation_id: string;
  product_id: string;
  basis: "customer_text_mention";
  last_seen_at: string;
};
type AutomationReport = {
  last_evaluated_at: string | null;
  evaluated: number; scheduled: number; blocked: number;
  finished: number; review_required: number;
  pending: number; overdue: number; consented_customers: number;
  provider_timestamps: number; official_webhook_events: number;
  delivery_enabled: boolean; channel: string;
};
type AutomationQueueItem = {
  follow_up_id: string; conversation_id: string;
  queue_state: "scheduled"|"blocked"|"review_required"|"finished";
  blockers: string[]; evaluated_at: string;
};
const blockerLabels: Record<string,string> = {
  consent_unverified: "Autorização comercial ainda não comprovada",
  provider_timestamp_unverified: "Horário original da mensagem ainda não verificado",
  provider_not_certified: "Canal oficial de envio ainda não homologado",
  sender_disabled: "Disparo automático desligado",
  outside_verified_window: "Janela de atendimento não verificada",
  customer_opted_out: "Cliente não autoriza mensagens",
  possible_purchase: "Possível compra: conferir antes de qualquer contato",
  conversation_not_waiting: "Atendimento não está aguardando cliente",
  business_reply_unverified: "Resposta mais recente da loja não confirmada",
};
type TintimSignal = {
  conversation_id: string;
  stage_label: string | null;
  ad_name: string | null;
  campaign_name: string | null;
  last_observed_at: string | null;
};
const hasPurchaseSignal = (stage: string | null | undefined) =>
  /^(comprou|convertido|vendido|venda realizada)$/i.test((stage ?? "").trim());

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const displayError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/crm_access_denied/i.test(message)) return "CRM bloqueado para esta conta. É necessário habilitar o acesso específico da Luciane.";
  if (/crm_consent_evidence_required/i.test(message)) return "Descreva quando e como o cliente autorizou as mensagens.";
  if (/crm_not_eligible|crm_opt_out/i.test(message)) return "Contato sem permissão ou atendimento encerrado. Nenhuma mensagem foi preparada.";
  if (/crm_follow_up_not_due/i.test(message)) return "Esse lembrete ainda não venceu ou já foi finalizado.";
  if (/Could not find the function|PGRST202|relation .* does not exist/i.test(message)) return "Módulo CRM ainda não foi ativado no banco. A loja continua funcionando normalmente.";
  return message || "Não foi possível concluir a ação.";
};

export function AdminCrmPanel({ client }: { client: SupabaseClient }) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [signals, setSignals] = useState<Record<string,TintimSignal>>({});
  const [mentions, setMentions] = useState<Record<string,ProductMention>>({});
  const [automation, setAutomation] = useState<AutomationReport | null>(null);
  const [automationQueue, setAutomationQueue] = useState<Record<string,AutomationQueueItem>>({});

  const [view, setView] = useState<View>("due");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [interest, setInterest] = useState<Record<string,string>>({});
  const [evidence, setEvidence] = useState<Record<string,string>>({});
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [onlyWithProduct, setOnlyWithProduct] = useState(false);
  const [listLimit, setListLimit] = useState(15);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Importacao passiva dos ultimos sinais do Tintim: nenhum envio ou lembrete.
      // Uma falha de sync nao pode impedir leitura de oportunidades ja cadastradas.
      const sync = await client.rpc("crm_sync_recent_tintim", { p_hours: 72, p_limit: 100 });
      if (sync.error && !/PGRST202|Could not find the function/i.test(sync.error.message)) {
        throw sync.error;
      }
      const hold = await client.rpc("crm_hold_tintim_purchase_signals");
      if (hold.error) throw hold.error;
      const [list,candidatesResult,signalsResult,mentionsResult,reportResult,queueResult] = await Promise.all([
        client.rpc("crm_list_opportunities"),
        client.rpc("crm_list_tintim_candidates", { p_limit: 40 }),
        client.rpc("crm_list_tintim_signals"),
        client.rpc("crm_list_tintim_product_hints"),
        client.rpc("crm_automation_operational_report"),
        client.rpc("crm_automation_queue_items"),
      ]);
      if (list.error) throw list.error;
      if (candidatesResult.error) throw candidatesResult.error;
      if (signalsResult.error) throw signalsResult.error;
      // Migração aditiva: durante homologação uma instalação anterior pode não
      // ter esta RPC. O painel existente continua funcionando normalmente.
      if (mentionsResult.error && !/PGRST202|Could not find the function/i.test(mentionsResult.error.message)) {
        throw mentionsResult.error;
      }
      setItems((list.data ?? []) as Opportunity[]);
      setCandidates((candidatesResult.data ?? []) as Candidate[]);
      setSignals(Object.fromEntries(((signalsResult.data ?? []) as TintimSignal[])
        .map(signal => [signal.conversation_id,signal])));
      setMentions(Object.fromEntries(((mentionsResult.data ?? []) as ProductMention[])
        .map(mention => [mention.conversation_id,mention])));
      // Optional observer RPCs: a temporary rollout discrepancy must not
      // interrupt the existing order/CRM interface. Never guess readiness.
      setAutomation(reportResult.error ? null : (reportResult.data as AutomationReport));
      setAutomationQueue(queueResult.error ? {} : Object.fromEntries(
        ((queueResult.data ?? []) as AutomationQueueItem[])
          .map(item => [item.follow_up_id,item])
      ));
      setError("");
    } catch (e) { setError(displayError(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [client]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setListLimit(15); }, [view, search, onlyWithProduct]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState==="visible") void refresh();
    }, 60000);
    const onReturn=() => { if (document.visibilityState==="visible") void refresh(); };
    document.addEventListener("visibilitychange",onReturn);
    return () => { window.clearInterval(timer);document.removeEventListener("visibilitychange",onReturn); };
  }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const waiting = useMemo(() => items.filter((item) =>
    item.status !== "converted" && item.status !== "lost" && item.status !== "closed"
  ), [items]);
  const bucketOf = useCallback((item: Opportunity) => crmQueueBucket({
    status: item.status,
    follow_up_status: item.follow_up_status,
    follow_up_due_at: item.follow_up_due_at,
    consent_status: item.consent_status,
    commercial_opt_out: item.commercial_opt_out,
    possible_purchase: hasPurchaseSignal(signals[item.conversation_id]?.stage_label)
  }, now), [signals, now]);
  // "Para agora" = revisão manual possível, NÃO autorização para envio Meta.
  const due = waiting.filter(item => bucketOf(item) === "review_now");
  const review = waiting.filter(item => bucketOf(item) === "blocked_due");
  const scheduled = waiting.filter(item => bucketOf(item) === "scheduled");
  const newLeads = waiting.filter(item => item.status==="in_progress" && !item.last_outbound_at);
  const visible = view === "due" ? due : view === "review" ? review :
    view === "new" ? newLeads : waiting;
  const filteredVisible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    let shortlist = term ? visible.filter(item => [
      item.customer_name, item.phone_e164, item.interest_label ?? "",
      item.source_label ?? "", signals[item.conversation_id]?.ad_name ?? "",
      crmMentionedProductName(mentions[item.conversation_id]?.product_id) ?? "",
    ].some(value => value.toLocaleLowerCase("pt-BR").includes(term))) : visible;
    const hasProduct = (item: Opportunity) => Boolean(item.interest_label ||
      crmMentionedProductName(mentions[item.conversation_id]?.product_id) ||
      crmAdSliceHint(signals[item.conversation_id]?.ad_name));
    if (view === "active" && onlyWithProduct) shortlist = shortlist.filter(hasProduct);
    // Lista de acompanhamento: priorizar quem tem lembrete, depois produto,
    // depois atividade recente. Sinal de anúncio não confirma preferencia.
    if (view === "active") return [...shortlist].sort((a,b) => {
      const rank = (item: Opportunity) => (
        item.status === "waiting_customer" && item.follow_up_status === "pending" ? 2 : 0
      ) + (hasProduct(item) ? 1 : 0);
      return rank(b)-rank(a) ||
        Date.parse(b.last_outbound_at ?? b.last_inbound_at ?? b.created_at) -
        Date.parse(a.last_outbound_at ?? a.last_inbound_at ?? a.created_at);
    });
    if (view === "new") return [...shortlist].sort((a,b) =>
      new Date(signals[b.conversation_id]?.last_observed_at ?? 0).getTime() -
      new Date(signals[a.conversation_id]?.last_observed_at ?? 0).getTime());
    return [...shortlist].sort((a,b) =>
      Date.parse(a.follow_up_due_at ?? "")-Date.parse(b.follow_up_due_at ?? ""));
  }, [visible,search,signals,mentions,view,onlyWithProduct]);

  const displayedVisible = view === "due" || view === "review"
    ? filteredVisible : filteredVisible.slice(0, listLimit);

  const run = async (key: string, operation: () => Promise<void>, success: string) => {
    if (pending) return;
    setPending(key); setError(""); setNotice("");
    try { await operation(); await refresh(); setNotice(success); }
    catch (e) { setError(displayError(e)); }
    finally { setPending(null); }
  };
  const invoke = (id: string, action: string, extra: Record<string, unknown> = {}) =>
    run(id + action, async () => {
      const { error: rpcError } = await client.rpc("crm_record_action", {
        p_conversation_id: id, p_action: action,
        // Confirmar o produto é uma ação independente e verificável.
        // Nunca salvar um campo não confirmado apenas por clicar em responder.
        p_interest: null,
        p_due_minutes: 45, p_evidence: evidence[id]?.trim() || null,
        ...extra,
      });
      if (rpcError) throw rpcError;
    }, action === "waiting" ? "Lembrete programado no painel para 45 minutos." :
       action === "sent_manually" ? "Registro manual concluído. Não houve envio pela API." :
       action === "consent_granted" ? "Autorização comercial registrada com evidência." :
       "Atendimento atualizado.");

  const saveConfirmedInterest = (id: string) =>
    run(id + "confirmed_interest", async () => {
      const label = interest[id]?.trim();
      if (!label || label.length < 2 || label.length > 80) {
        throw new Error("Informe o produto confirmado pela equipe.");
      }
      const { error: rpcError } = await client.rpc("crm_confirm_interest",{
        p_conversation_id:id,p_interest:label
      });
      if (rpcError) throw rpcError;
    }, "Produto confirmado e salvo sem alterar o lembrete.");

  return (
    <section className="crm-panel" aria-label="Acompanhamento comercial">
      <div className="crm-head">
        <div><span className="crm-eyebrow">RELACIONAMENTO</span>
          <h1>Oportunidades de venda</h1>
          <p>Quem demonstrou interesse não precisa ficar esquecido no WhatsApp.</p>
        </div>
        <button className="crm-button crm-secondary" type="button" disabled={loading || refreshing || !!pending} onClick={() => void refresh()}>
          <RefreshCw size={16}/> {refreshing ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      <div className="crm-info"><ShieldCheck size={18} aria-hidden="true"/>
        <span>CRM conectado: <strong>nenhuma mensagem é enviada automaticamente.</strong> Abrir o WhatsApp não comprova envio.</span>
      </div>
      <section className="crm-engine-panel" aria-label="Saúde da automação de 45 minutos">
        <div className="crm-engine-heading">
          <div>
            <span className="crm-eyebrow">MOTOR DE ACOMPANHAMENTO</span>
            <h2>Automação de 45 minutos</h2>
            <p>Observa, agenda e cancela lembretes sem enviar mensagens indevidas.</p>
          </div>
          <strong className="crm-engine-state">Envio desligado</strong>
        </div>
        {automation ? <>
          <div className="crm-engine-stats">
            <div><strong>{automation.pending}</strong><span>Pendentes</span></div>
            <div><strong>{automation.overdue}</strong><span>Vencidos</span></div>
            <div><strong>{automation.blocked}</strong><span>Bloqueados na auditoria</span></div>
            <div><strong>{automation.scheduled}</strong><span>Programados</span></div>
          </div>
          <p className="crm-engine-timestamp">
            Auditoria da fila: {automation.last_evaluated_at
              ? fmtTime(automation.last_evaluated_at)+" (Paragominas)"
              : "ainda não executada"}
          </p>
          <details className="crm-engine-details">
            <summary>O que falta para ativar o envio automático?</summary>
            <div className="crm-engine-blockers">
            <span>{automation.consented_customers===0
              ? "Nenhum cliente tem consentimento comercial comprovado no CRM."
              : automation.consented_customers+" clientes têm consentimento documentado; cada contato ainda depende de validação."}</span>
            <span>{automation.provider_timestamps===0 && automation.official_webhook_events===0
              ? "Sem horários originais confirmados pelo provedor/Meta."
              : "Existem eventos do provedor para validação individual da janela de atendimento."}</span>
            <span>Integração de envio com a Coexistence do Tintim não homologada. Nada é disparado por esta tela.</span>
            </div>
          </details>
        </> : <p className="crm-engine-timestamp">
          Monitor de automação ainda indisponível neste deploy. A ausência de dados não autoriza disparos.
        </p>}
      </section>
      {/* Os números do motor e das abas já exibem contagens. Evitar cartões duplicados. */}
      <div className="crm-navigation" role="group" aria-label="Filtrar atendimentos">
        <button type="button" className={view==="due"?"is-active":""} onClick={()=>setView("due")}>Para agora <b>{due.length}</b></button>
        <button type="button" className={view==="review"?"is-active":""} onClick={()=>setView("review")}>Revisar <b>{review.length}</b></button>
        <button type="button" className={view==="new"?"is-active":""} onClick={()=>setView("new")}>Triagem <b>{newLeads.length}</b></button>
        <button type="button" className={view==="active"?"is-active":""} onClick={()=>setView("active")}>Acompanhar <b>{waiting.length}</b></button>
        <button type="button" className={view==="tintim"?"is-active":""} onClick={()=>setView("tintim")}>Contatos Tintim</button>
      </div>
      <p className="crm-guidance">
        <strong>Fila inteligente:</strong> o Tintim agenda e cancela lembretes automaticamente.
        <strong> Para agora</strong> exige revisão humana antes de qualquer contato;
        <strong> Revisar</strong> guarda vencidos com consentimento ausente, opt-out ou possível compra.
        Nenhuma mensagem é enviada automaticamente. Um anúncio ou uma menção de fatia não comprovam autorização.
      </p>
      {view==="due" && due.length===0 && review.length>0 && <div className="crm-empty-attention">
        Nenhum atendimento habilitado para revisão imediata. Existem {review.length} lembretes
        vencidos que exigem conferência ou autorização — não devem ser enviados automaticamente.
        <button type="button" onClick={()=>setView("review")}>Ver pendências</button>
      </div>}
      {view!=="tintim" && <label className="crm-search">
        <Search size={17} aria-hidden="true"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar nome, telefone, produto ou origem" aria-label="Buscar contatos do CRM"/>
        {search && <button type="button" onClick={()=>setSearch("")}>Limpar</button>}
      </label>}
      {view==="active" && <label className="crm-product-filter">
        <input type="checkbox" checked={onlyWithProduct} onChange={e=>setOnlyWithProduct(e.target.checked)}/>
        Mostrar somente atendimentos com indicação de produto
      </label>}
      {error && <div role="alert" className="crm-error">{error}</div>}
      {notice && <div role="status" className="crm-success"><Check size={16}/>{notice}</div>}
      {loading && <div role="status" className="crm-loading">Carregando oportunidades…</div>}

      {view!=="tintim" && !loading && filteredVisible.length===0 && !error && (
        <div className="crm-empty"><Clock3 size={24}/><strong>{search?"Nenhum contato encontrado":view==="due"?"Nenhum follow-up para revisão imediata":view==="review"?"Nenhuma pendência bloqueada":view==="new"?"Nenhum contato aguardando triagem":"Nenhuma oportunidade em acompanhamento"}</strong>
          <p>Os contatos recentes do Tintim entram automaticamente quando esta aba é aberta. As mensagens continuam no aplicativo da Luciane.</p></div>
      )}
      {view!=="tintim" && !loading && !error && <p className="crm-list-count">
        {filteredVisible.length} {filteredVisible.length===1?"contato":"contatos"} nesta visualização
      </p>}
      {view!=="tintim" && <div className="crm-list">{displayedVisible.map(item => {
        const eligible = !item.commercial_opt_out && item.consent_status==="granted";
        const isDue = item.status==="waiting_customer" && item.follow_up_status==="pending"
          && !!item.follow_up_due_at && new Date(item.follow_up_due_at).getTime()<=now;
        const locked = !!pending;
        const signal = signals[item.conversation_id];
        const adHint = crmAdSliceHint(signal?.ad_name);
        const mention = mentions[item.conversation_id];
        const mentionedName = crmMentionedProductName(mention?.product_id);
        const draftInterest = item.interest_label;
        const inputInterest = interest[item.conversation_id] ?? item.interest_label ?? "";
        const unsavedInterest = inputInterest.trim() !== (item.interest_label ?? "").trim();
        const possiblePurchase = hasPurchaseSignal(signal?.stage_label);
        const audit = item.follow_up_id ? automationQueue[item.follow_up_id] : undefined;
        const isExpanded = expanded[item.conversation_id] ??
          (view==="due" && isDue && eligible && !possiblePurchase);
        return <article className={"crm-card "+(!isExpanded?"crm-card-compact":"")} key={item.conversation_id}>
          <header>
            <div className="crm-name"><strong>{item.customer_name}</strong>
              <small>{item.source_label || "Origem não confirmada"} · final {item.phone_e164.slice(-4)}</small>
              {(item.interest_label || mentionedName || adHint) && <small className="crm-product-recap">
                {item.interest_label ? "Confirmado: " + item.interest_label :
                  mentionedName ? "Cliente mencionou: " + mentionedName :
                  "Anúncio relacionado: " + adHint?.name}
              </small>}
              {signal?.last_observed_at &&
                <small>Cadastro/etapa Tintim atualizada: {fmtTime(signal.last_observed_at)}</small>}
            </div>
            <div className="crm-card-controls">
              <span className={"crm-pill "+(isDue?"crm-due":"")}>
                {possiblePurchase?"Possível compra":item.commercial_opt_out?"Contato bloqueado":
                  isDue && item.consent_status!=="granted"?"Autorização pendente":
                  isDue?"Revisar antes de contatar":
                  item.status==="waiting_customer"?"Aguardando cliente":"Em atendimento"}
              </span>
              <button type="button" className="crm-expand" aria-expanded={isExpanded}
                onClick={()=>setExpanded(previous=>({...previous,[item.conversation_id]:!isExpanded}))}>
                {isExpanded?"Recolher":"Ver atendimento"}
                <ChevronDown size={16} className={isExpanded?"crm-chevron-up":""}/>
              </button>
            </div>
          </header>
          {isExpanded && <>
          {possiblePurchase && <p className="crm-purchase-review" role="note">
            O Tintim sinalizou “Comprou”. Confira esse registro antes de fazer novo follow-up.
            O CRM não confirmou pagamento nem registrou faturamento.
          </p>}
          {signal?.ad_name && <p className="crm-ad-signal">
            <strong>Referência do anúncio:</strong> {signal.ad_name}
            <small> Indica o anúncio associado, não comprova qual produto o cliente pediu.</small>
            {adHint && <small><strong>Sabor sugerido pelo anúncio:</strong> {adHint.name}.
              Hipótese, não preferência confirmada nem permissão para contato.</small>}
          </p>}
          {mentionedName && <p className="crm-ad-signal">
            <strong>Fatia mencionada pelo cliente:</strong> {mentionedName}
            <small>Identificação automática a partir de mensagem de texto.
              Não confirma pedido, escolha final nem autorização para disparo.
              {mention?.last_seen_at ? " Último sinal: " + fmtTime(mention.last_seen_at) : ""}
            </small>
          </p>}
          {audit?.queue_state==="blocked" && <details className="crm-audit-reasons">
            <summary>Motivos do bloqueio ({audit.blockers.length})</summary>
            <ul>{audit.blockers.map(code=><li key={code}>
              {blockerLabels[code] ?? "Exige verificação: "+code}
            </li>)}</ul>
            <small>Diagnóstico técnico; não constitui autorização de envio.</small>
          </details>}
                    <div className="crm-confirm-product">
            <label className="crm-label">Produto confirmado pela equipe
              <small>Salvar não cria nem altera lembretes. Menções e anúncios continuam como sugestões.</small>
              <input type="text" maxLength={80} placeholder="Ex.: Chocolate com Morango"
                value={inputInterest}
                disabled={locked}
                onChange={(e)=>setInterest(old=>({...old,[item.conversation_id]:e.target.value}))}/>
            </label>
            <button type="button" className="crm-button crm-secondary"
              disabled={locked || !unsavedInterest || inputInterest.trim().length<2}
              onClick={()=>void saveConfirmedInterest(item.conversation_id)}>Salvar produto confirmado</button>
          </div>
          {item.follow_up_status==="pending" && item.follow_up_due_at &&
            <p className="crm-due-info">Lembrete: {fmtTime(item.follow_up_due_at)} (Paragominas)
              {isDue && <strong> · Vencido, aguardando conferência</strong>}
            </p>}
          <details className="crm-manual-controls">
            <summary>Correções manuais do atendimento</summary>
            <div className="crm-actions">
              <button className="crm-button crm-secondary" type="button"
                disabled={locked || item.commercial_opt_out || possiblePurchase ||
                  (item.status==="waiting_customer" && item.follow_up_status==="pending")}
                onClick={()=>void invoke(item.conversation_id,"waiting")}>
                {item.status==="waiting_customer" && item.follow_up_status==="pending"
                  ? "Lembrete automático já ativo" : "Registrar resposta manual · 45 min"}
              </button>
              <button className="crm-button crm-secondary" type="button" disabled={locked}
                onClick={()=>void invoke(item.conversation_id,"replied")}>Registrar resposta do cliente</button>
              <button className="crm-button crm-secondary" type="button" disabled={locked}
                onClick={()=>{ if(window.confirm("Confirmar que este cliente comprou? Isso registra apenas uma conversão manual, sem alterar o pedido ou o faturamento.")) void invoke(item.conversation_id,"converted"); }}>Registrar compra manual</button>
            </div>
            <div className="crm-minor-actions">
              <button type="button" disabled={locked || item.commercial_opt_out}
                onClick={()=>{ if(window.confirm("O cliente pediu para não receber mensagens comerciais? Esta ação bloqueará follow-ups deste telefone.")) void invoke(item.conversation_id,"opt_out"); }}>Não receber mensagens</button>
              <button type="button" disabled={locked}
                onClick={()=>void invoke(item.conversation_id,"closed")}>Encerrar atendimento</button>
            </div>
          </details>
          {item.status==="waiting_customer" && item.follow_up_status==="pending" && <div className="crm-followup">
            {!isDue && <p className="crm-due-info">Rascunho preparado para revisão.
              O lembrete ainda não venceu; nenhuma mensagem será enviada automaticamente.</p>}
            <p className="crm-ad-signal"><strong>Rascunho de acompanhamento:</strong>{" "}
              {crmSuggestedMessage(draftInterest,signal?.ad_name,mention?.product_id)}
              {(!draftInterest?.trim() && (mentionedName || adHint)) && <small>
                Personalização sugerida a partir de sinal, não de preferência confirmada.
                Envio bloqueado até autorização comercial válida.
              </small>}
            </p>
            {isDue && (eligible && !possiblePurchase ? <>
              <a className="crm-button crm-whatsapp" href={crmWhatsAppLink(item.phone_e164,draftInterest,signal?.ad_name,mention?.product_id)}
                 target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> Abrir mensagem sugerida</a>
              <button className="crm-button crm-secondary" type="button" disabled={locked}
                 onClick={()=>{if(window.confirm("Você realmente enviou esta mensagem fora do CRM? Abrir o WhatsApp não comprova envio.")) void invoke(item.conversation_id,"sent_manually");}}>Registrar envio feito manualmente</button>
            </> : <p>{possiblePurchase?"Follow-up suspenso: possível compra sinalizada no Tintim.": "Mensagem comercial indisponível: autorização não registrada ou contato bloqueado."}</p>)}
            {isDue && <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>void invoke(item.conversation_id,"snooze",{p_due_minutes:60})}>Adiar 1 hora</button>}
          </div>}
          {!eligible && !item.commercial_opt_out && <div className="crm-consent">
            <label className="crm-label">Evidência de autorização para contato comercial
              <input type="text" maxLength={240} value={evidence[item.conversation_id] ?? ""}
                 placeholder="Ex.: cliente autorizou lembretes na conversa de hoje"
                 onChange={(e)=>setEvidence(old=>({...old,[item.conversation_id]:e.target.value}))}/>
            </label>
            <button className="crm-button crm-secondary" type="button"
              disabled={locked || (evidence[item.conversation_id] ?? "").trim().length<8}
              onClick={()=>void invoke(item.conversation_id,"consent_granted")}>Registrar autorização</button>
          </div>}

          </>}
        </article>;
      })}</div>}
      {view!=="tintim" && !loading && !error && displayedVisible.length < filteredVisible.length &&
        <button type="button" className="crm-button crm-secondary crm-load-more"
          onClick={()=>setListLimit(previous=>previous+15)}>
          Mostrar mais atendimentos ({filteredVisible.length-displayedVisible.length} restantes)
        </button>}
      {view==="tintim" && <div className="crm-list">
        <section className="crm-card">
          <h2>Novo contato</h2>
          <p className="crm-muted">Para alguém que não aparece no Tintim. Cadastrar não envia mensagens.</p>
          <div className="crm-create">
            <input type="text" maxLength={100} placeholder="Nome do contato" value={newName}
              onChange={e=>setNewName(e.target.value)} aria-label="Nome do contato" />
            <input type="tel" maxLength={24} placeholder="Celular com DDD" value={newPhone}
              onChange={e=>setNewPhone(e.target.value)} aria-label="Celular com DDD" />
            <button className="crm-button" type="button" disabled={!!pending || !newName.trim() || !newPhone.trim()}
              onClick={()=>void run("new",async()=>{
                const {error:rpcError}=await client.rpc("crm_open_opportunity",{p_name:newName,p_phone:newPhone});
                if(rpcError) throw rpcError; setNewName("");setNewPhone("");setView("active");
              },"Contato adicionado para acompanhamento.")}><UserPlus size={16}/> Adicionar</button>
          </div>
        </section>
        {!loading && candidates.slice(0,listLimit).map(candidate=><article className="crm-card crm-candidate" key={candidate.tintim_id}>
          <div><strong>{candidate.contact_name}</strong>
            <p>{candidate.source_label||"Origem não classificada"}{candidate.campaign_name?" · "+candidate.campaign_name:""}</p>
            <small>Celular final {candidate.phone_hint} · último sinal {fmtTime(candidate.last_seen_at)}</small>
          </div>
          <button className="crm-button crm-secondary" type="button" disabled={!!pending || candidate.imported}
            onClick={()=>void run(candidate.tintim_id,async()=>{
              const {error:rpcError}=await client.rpc("crm_open_opportunity",{p_tintim_id:candidate.tintim_id});
              if(rpcError) throw rpcError;setView("active");
            },"Contato incluído sem disparar mensagem.")}>
            {candidate.imported?"Acompanhando":"Acompanhar"}
          </button>
        </article>)}
        {!loading && candidates.length>listLimit &&
          <button className="crm-button crm-secondary crm-load-more" type="button"
            onClick={()=>setListLimit(previous=>previous+15)}>
            Mostrar mais contatos Tintim ({candidates.length-listLimit} restantes)
          </button>}
      </div>}
    </section>
  );
}
