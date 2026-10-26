"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, Clock3, MessageCircle, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
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
type View = "due" | "active" | "tintim";
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
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
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const due = useMemo(() => items.filter((item) => item.status === "waiting_customer"
    && item.follow_up_status === "pending" && item.follow_up_due_at
    && new Date(item.follow_up_due_at).getTime() <= now), [items,now]);
  const waiting = useMemo(() => items.filter((item) => item.status !== "converted"
    && item.status !== "lost" && item.status !== "closed"), [items]);
  const visible = view === "due" ? due : waiting;

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
        <button type="button" className={view==="active"?"is-active":""} onClick={()=>setView("active")}>Em acompanhamento <b>{waiting.length}</b></button>
        <button type="button" className={view==="tintim"?"is-active":""} onClick={()=>setView("tintim")}>Contatos Tintim</button>
      </div>
      {error && <div role="alert" className="crm-error">{error}</div>}
      {notice && <div role="status" className="crm-success"><Check size={16}/>{notice}</div>}
      {loading && <div role="status" className="crm-loading">Atualizando oportunidades…</div>}

      {view!=="tintim" && !loading && visible.length===0 && !error && (
        <div className="crm-empty"><Clock3 size={24}/><strong>{view==="due"?"Nenhum follow-up vencido":"Nenhuma oportunidade em acompanhamento"}</strong>
          <p>Use a aba Contatos Tintim para criar atendimentos. As mensagens continuam no aplicativo da Luciane.</p></div>
      )}
      {view!=="tintim" && <div className="crm-list">{visible.map(item => {
        const eligible = !item.commercial_opt_out && item.consent_status==="granted";
        const isDue = item.status==="waiting_customer" && item.follow_up_status==="pending"
          && !!item.follow_up_due_at && new Date(item.follow_up_due_at).getTime()<=now;
        const locked = !!pending;
        return <article className="crm-card" key={item.conversation_id}>
          <header>
            <div className="crm-name"><strong>{item.customer_name}</strong>
              <small>{item.source_label || "Origem não confirmada"} · final {item.phone_e164.slice(-4)}</small>
            </div>
            <span className={"crm-pill "+(isDue?"crm-due":"")}>
              {isDue?"Follow-up vencido":item.status==="waiting_customer"?"Aguardando cliente":"Atendimento"}
            </span>
          </header>
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
              onClick={()=>void invoke(item.conversation_id,"waiting")}>Aguardando · 45 min</button>
            <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>void invoke(item.conversation_id,"replied")}>Cliente respondeu</button>
            <button className="crm-button crm-secondary" type="button" disabled={locked}
              onClick={()=>void invoke(item.conversation_id,"converted")}>Comprou</button>
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
               onClick={()=>void invoke(item.conversation_id,"opt_out")}>Não receber mensagens</button>
            <button type="button" disabled={locked}
               onClick={()=>void invoke(item.conversation_id,"closed")}>Encerrar atendimento</button>
          </div>
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
