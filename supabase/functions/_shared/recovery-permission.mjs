// Existing staff consent + matching append-only audit, never inferred from interest.
export async function recoveryPermission(client,customer,now,context=null) {
 const clock=Date.parse(now),at=Date.parse(customer.consent_at);
 if(customer.commercial_opt_out!==false || customer.consent_status==='denied')
  return {verified:false,basis:'revoked'};
 // Trusted private read model only, never request fields or a customer-wide grant.
 if(context) {
  if(['revoked','used','scope_changed'].includes(context.state))return {verified:false,basis:'context_permission_'+context.state};
  if(context.state==='granted') {
   if(context.verified===true&&context.scoped===true&&context.scope==='one_context_follow_up'&&
    context.version==='context-recovery-1'&&context.send_authorized===false&&
    Number.isFinite(clock)&&Date.parse(context.valid_until)>clock&&Date.parse(context.valid_until)<=clock+86400000)
    return {verified:true,basis:'signed_context_permission'};
   return {verified:false,basis:'context_permission_invalid'};
  }
 }
 if(customer.consent_status!=='granted')return {verified:false,basis:'not_recorded'};
 if(!Number.isFinite(at)||at>clock||!customer.consent_evidence?.trim()||
    customer.consent_evidence.trim().length<8)return {verified:false,basis:'invalid_evidence'};
 if(typeof client.rpc!=='function')return {verified:false,basis:'audit_unavailable'};
 try {
  const r=await client.rpc('crm_recovery_permission_evidence',{p_customer_id:customer.id});
  return r.error || r.data!==true ? {verified:false,basis:'audit_unverified'} :
   {verified:true,basis:'staff_evidence_audited'};
 }catch{return {verified:false,basis:'audit_unavailable'};}
}
