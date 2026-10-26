"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, ChevronDown, Clock3, MessageCircle, RefreshCw, Search, ShieldCheck, UserPlus } from "lucide-react";
import { crmWhatsAppLink } from "@/lib/crm-follow-up";
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
type View = "due" | "new" | "active" | "tintim";
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
  const [view, setView] = useState<View>("due");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [interest, setInterest] = useState<Record<string,string>>({});
  const [evidence, setEvidence] = useState<Record<string,string>>({});
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Importacao passiva dos ultimos sinais do Tintim: nenhum envio ou lembrete.
      // Uma falha de sync nao pode impedir leitura de oportunidades ja cadastradas.
      const sync = await client.rpc("crm_sync_recent_tintim", { p_hours: 72, p_limit: 100 });
      if (sync.error && !/PGRST202|Could not find the function/i.test(sync.error.message)) {
        throw sync.error;
      }
      const [list,candidatesResult] = await Promise.all([
        client.rpc("crm_list_opportunities"),
        client.rpc("crm_list_tintim_candidates", { p_limit: 40 }),
      ]);
      if (list.error) throw list.error;
      if (candidatesResult.error) throw candidatesResult.error;
      setItems((list.data ?? []) as Opportunity[]);
      setCandidates((candidatesResult.data ?? []) as Candidate[]);
      setError("");
    } catch (e) { setError(displayError(e)); }
    finally { setLoading(false); }
  }, [client]);

  useEffect(() => { void refresh(); }, [refresh]);
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

  const due = useMemo(() => items.filter((item) => item.status === "waiting_customer"
    && item.follow_up_status === "pending" && item.follow_up_due_at
    && new Date(item.follow_up_due_at).getTime() <= now), [items,now]);
  const waiting = useMemo(() => items.filter((item) => item.status !== "converted"
    && item.status !== "lost" && item.status !== "closed"), [items]);
  const newLeads = waiting.filter(item => item.status==="in_progress" && !item.last_outbound_at);
  const visible = view === "due" ? due : view === "new" ? newLeads : waiting;
  const filteredVisible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return visible;
    return visible.filter(item => [
      item.customer_name, item.phone_e164, item.interest_label ?? "",
      item.source_label ?? "",
    ].some(value => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [visible,search]);

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
        p_interest: interest[id]?.trim() || null,
        p_due_minutes: 45, p_evidence: evidence[id]?.trim() || null,
        ...extra,
      });
      if (rpcError) throw rpcError;
    }, action === "waiting" ? "Lembrete programado no painel para 45 minutos." :
       action === "sent_manually" ? "Registro manual concluído. Não houve envio pela API." :
       action === "consent_granted" ? "Autorização comercial registrada com evidência." :
       "Atendimento atualizado.");

  return (
    <section className="crm-panel" aria-label="Acompanhamento comercial">
      <div className="crm-head">
        <div><span className="crm-eyebrow">RELACIONAMENTO</span>
          <h1>Oportunidades de venda</h1>
          <p>Quem demonstrou interesse não precisa ficar esquecido no WhatsApp.</p>
        </div>
        <button className="crm-button crm-secondary" type="button" disabled={loading || !!pending} onClick={() => void refresh()}>
          <RefreshCw size={16}/> Atualizar
        </button>
      </div>
      <div className="crm-info"><ShieldCheck size={18} aria-hidden="true"/>
        <span>Modo assistido: <strong>nenhuma mensagem é enviada automaticamente.</strong> Abrir uma conversa não confirma que a mensagem foi enviada.</span>
      </div>
      <div className="crm-navigation" role="group" aria-label="Filtrar atendimentos">
        <button type="button" className={view==="due"?"is-active":""} onClick={()=>setView("due")}>Para agora <b>{due.length}</b></button>
        <button type="button" className={view==="new"?"is-active":""} onClick={()=>setView("new")}>Triagem <b>{newLeads.length}</b></button>
        <button type="button" className={view==="active"?"is-active":""} onClick={()=>setView("active")}>Acompanhar <b>{waiting.length}</b></button>
        <button type="button" className={view==="tintim"?"is-active":""} onClick={()=>setView("tintim")}>Contatos Tintim</button>
      </div>
      <p className="crm-guidance">
        <strong>Como funciona:</strong> o Tintim organiza contatos, mas ainda não comprova quem está esperando resposta.
        Abra somente os atendimentos que você realmente respondeu e marque <strong>Já respondi</strong> para iniciar o lembrete.
        Nenhuma mensagem é enviada por este painel.
      </p>
      {view!=="tintim" && <label className="crm-search">
        <Search size={17} aria-hidden="true"/>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar nome, telefone, produto ou origem" aria-label="Buscar contatos do CRM"/>
        {search && <button type="button" onClick={()=>setSearch("")}>Limpar</button>}
      </label>}
      {error && <div role="alert" className="crm-error">{error}</div>}
      {notice && <div role="status" className="crm-success"><Check size={16}/>{notice}</div>}
      {loading && <div role="status" className="crm-loading">Atualizando oportunidades…</div>}

      {view!=="tintim" && !loading && filteredVisible.length===0 && !error && (
        <div className="crm-empty"><Clock3 size={24}/><strong>{search?"Nenhum contato encontrado":view==="due"?"Nenhum follow-up vencido":view==="new"?"Nenhum contato aguardando triagem":"Nenhuma oportunidade em acompanhamento"}</strong>
          <p>Os contatos recentes do Tintim entram automaticamente quando esta aba é aberta. As mensagens continuam no aplicativo da Luciane.</p></div>
      )}
      {view!=="tintim" && !loading && !error && <p className="crm-list-count">
        {filteredVisible.length} {filteredVisible.length===1?"contato":"contatos"} nesta visualização
      </p>}
      {view!=="tintim" && <div className="crm-list">{filteredVisible.map(item => {
        const eligible = !item.commercial_opt_out && item.consent_status==="granted";
        const isDue = item.status==="waiting_customer" && item.follow_up_status==="pending"
          && !!item.follow_up_due_at && new Date(item.follow_up_due_at).getTime()<=now;
        const locked = !!pending;
        const isExpanded = expanded[item.conversation_id] ?? isDue;
        return <article className={"crm-card "+(!isExpanded?"crm-card-compact":"")} key={item.conversation_id}>
          <header>
            <div className="crm-name"><strong>{item.customer_name}</strong>
              <small>{item.source_label || "Origem não confirmada"} · final {item.phone_e164.slice(-4)}</small>
            </div>
            <div className="crm-card-controls">
              <span className={"crm-pill "+(isDue?"crm-due":"")}>
                {isDue?"Lembrete vencido":item.status==="waiting_customer"?"Aguardando cliente":"Para revisar"}
              </span>
              <button type="button" className="crm-expand" aria-expanded={isExpanded}
                onClick={()=>setExpanded(previous=>({...previous,[item.conversation_id]:!isExpanded}))}>
                {isExpanded?"Recolher":"Ver atendimento"}
                <ChevronDown size={16} className={isExpanded?"crm-chevron-up":""}/>
              </button>
            </div>
          </header>
          {isExpanded && <>
          <label className="crm-label">Produto de interesse <small>(confirmado pela Luciane)</small>
            <input type="text" maxLength={80} placeholder="Ex.: Chocolate com Morango"
              value={interest[item.conversation_id] ?? item.interest_label ?? ""}
              disabled={locked}
              onChange={(e)=>setInterest(old=>({...old,[item.conversation_id]:e.target.value}))}/>
          </label>
          {item.follow_up_status==="pending" && item.follow_up_due_at &&
            <p className="crm-due-info">Lembrete: {fmtTime(item.follow_up_due_at)} (Paragominas)</p>}
          <div className="crm-actions">
            <button className="crm-button" type="button" disabled={locked || item.commercial_opt_out}
              onClick={()=>void invoke(item.conversation_id,"waiting")}>Já respondi · lembrar 45 min</button>
            <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>void invoke(item.conversation_id,"replied")}>Cliente respondeu</button>
            <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>{ if(window.confirm("Confirmar que este cliente comprou? Isso registra apenas uma conversão manual, sem alterar o pedido ou o faturamento.")) void invoke(item.conversation_id,"converted"); }}>Comprou</button>
          </div>
          {isDue && <div className="crm-followup">
            {eligible ? <>
              <a className="crm-button crm-whatsapp" href={crmWhatsAppLink(item.phone_e164,interest[item.conversation_id] ?? item.interest_label)}
                 target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> Abrir mensagem sugerida</a>
              <button className="crm-button crm-secondary" type="button" disabled={locked}
                 onClick={()=>void invoke(item.conversation_id,"sent_manually")}>Marcar como enviada</button>
            </> : <p>Mensagem comercial indisponível: autorização não registrada ou contato bloqueado.</p>}
            <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>void invoke(item.conversation_id,"snooze",{p_due_minutes:60})}>Adiar 1 hora</button>
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
          <div className="crm-minor-actions">
            <button type="button" disabled={locked || item.commercial_opt_out}
               onClick={()=>{ if(window.confirm("O cliente pediu para não receber mensagens comerciais? Esta ação bloqueará follow-ups deste telefone.")) void invoke(item.conversation_id,"opt_out"); }}>Não receber mensagens</button>
            <button type="button" disabled={locked}
               onClick={()=>void invoke(item.conversation_id,"closed")}>Encerrar atendimento</button>
          </div>
          </>}
        </article>;
      })}</div>}
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
        {!loading && candidates.map(candidate=><article className="crm-card crm-candidate" key={candidate.tintim_id}>
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
      </div>}
    </section>
  );
}
