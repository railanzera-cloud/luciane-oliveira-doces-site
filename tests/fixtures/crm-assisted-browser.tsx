"use client";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminCrmPanel } from "@/components/admin-crm-panel";

export default function Qa() {
 const [scenario,setScenario]=useState('elegivel');
 const [destination,setDestination]=useState('nenhum');
 const [state,setState]=useState('pending');
 const [rpcLog,setRpcLog]=useState<string[]>([]);
 const [generation,setGeneration]=useState(0);
 useEffect(()=>{
  const original=window.open;
  window.open=(()=>({opener:null,location:{replace:(url:string)=>setDestination(url)},close:()=>setDestination('bloqueado')})) as typeof window.open;
  return ()=>{window.open=original;};
 },[]);
 const client=useMemo(()=>{
  let sent=false;
  const now=Date.now();
  const item={conversation_id:'11111111-1111-4111-8111-111111111111',follow_up_id:'22222222-2222-4222-8222-222222222222',customer_name:'CLIENTE SINTÉTICO — TESTE',phone_e164:'5591999999999',consent_status:scenario==='sem_autorizacao'?'unknown':'granted',commercial_opt_out:scenario==='optout',interest_label:scenario==='sem_produto'?null:'Prestígio',status:scenario==='respondeu'?'in_progress':'waiting_customer',source_label:'Fixture local',last_inbound_at:new Date(now-7200000).toISOString(),last_outbound_at:new Date(now-3600000).toISOString(),follow_up_status:scenario==='respondeu'?'canceled':'pending',follow_up_due_at:new Date(now+(scenario==='agendado'?600000:-900000)).toISOString(),created_at:new Date(now-10800000).toISOString()};
  return {rpc(name:string,args:Record<string,unknown>){
   const promise=Promise.resolve().then(()=>{
    setRpcLog(log=>[...log.slice(-8),name]);
    let data:unknown=null;let error:unknown=null;
    if(name==='crm_list_opportunities')data=[{...item,follow_up_status:sent?'sent_manually':item.follow_up_status}];
    if(name==='crm_list_tintim_candidates'||name==='crm_list_tintim_product_hints'||name==='crm_automation_queue_items')data=[];
    if(name==='crm_list_tintim_signals')data=[{conversation_id:item.conversation_id,stage_label:scenario==='compra'?'Comprou':null,ad_name:'Vídeo Prestígio',last_observed_at:new Date(now).toISOString()}];
    if(name==='crm_assisted_followup_review'){
     const reasons=scenario==='horario'?['inbound_timestamp_unverified']:scenario==='falha'?['provider_unknown_blocker']:scenario==='respondeu_depois'?['not_waiting_customer']:scenario==='compra'?['purchase_signal_review']:scenario==='sem_autorizacao'?['consent_not_verified']:scenario==='sem_produto'?['product_not_confirmed']:sent?['not_pending']:[];
     data={eligible:reasons.length===0,reasons,checked_at:new Date().toISOString(),conversation_id:item.conversation_id,follow_up_id:item.follow_up_id,phone_e164:item.phone_e164,customer_name:item.customer_name,interest_label:item.interest_label};
    }
    if(name==='crm_assisted_record_send'){
     if(sent)error={message:'crm_assisted_review_required'};
     else {sent=true;setState('sent_manually');}
    }
    if(name==='crm_confirm_interest')item.interest_label=String(args.p_interest);
    if(name==='crm_record_action'){
     if(args.p_action==='consent_granted')item.consent_status='granted';
     if(args.p_action==='replied'){item.status='in_progress';item.follow_up_status='canceled';setState('replied');}
     if(args.p_action==='closed'||args.p_action==='converted'){item.status=String(args.p_action);item.follow_up_status='canceled';setState(String(args.p_action));}
    }
    return {data,error};
   });
   return Object.assign(promise,{abortSignal:()=>promise});
  }} as unknown as SupabaseClient;
 },[scenario,generation]);
 return <main style={{background:'#211914',padding:'16px',minHeight:'100vh',fontFamily:'Arial',color:'white'}}>
  <aside style={{padding:12,border:'2px dashed #c58b52',marginBottom:20}}>
   <strong>QA LOCAL — DADOS SINTÉTICOS — SEM REDE WHATSAPP</strong>
   <label style={{display:'block'}}>Cenário <select aria-label="Cenário de teste" value={scenario} onChange={e=>{setScenario(e.target.value);setDestination('nenhum');setState('pending');setRpcLog([]);}}>
    {['elegivel','sem_autorizacao','sem_produto','compra','respondeu','agendado','horario','respondeu_depois','falha','optout'].map(s=><option key={s}>{s}</option>)}
   </select></label>
   <button onClick={()=>{setGeneration(g=>g+1);setState('pending');setDestination('nenhum');}}>Reiniciar fixture</button>
   <p>Destino interceptado: <output aria-label="Destino interceptado" style={{overflowWrap:'anywhere'}}>{destination}</output></p>
   <p>Estado: <output aria-label="Estado da fixture">{state}</output></p>
   <details><summary>RPCs</summary>{rpcLog.join(' → ')}</details>
  </aside>
  <AdminCrmPanel key={scenario+generation} client={client}/>
 </main>;
}
