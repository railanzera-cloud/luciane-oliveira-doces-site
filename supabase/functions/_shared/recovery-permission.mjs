// Existing staff consent + matching append-only audit, never inferred from interest.
export async function recoveryPermission(client,customer,now) {
 const clock=Date.parse(now),at=Date.parse(customer.consent_at);
 if(customer.commercial_opt_out!==false || customer.consent_status==='denied')
  return {verified:false,basis:'revoked'};
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
