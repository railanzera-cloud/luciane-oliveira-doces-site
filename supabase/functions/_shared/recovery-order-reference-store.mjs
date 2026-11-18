// Internal only; no endpoint or caller-supplied trusted order/payment/phone facts.
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function privateRecoveryOrderReferences(client) {
 return {
  async capture(conversationId,reference) {
   if(!uuid(conversationId)||reference?.reference_status!=='candidate'||
    !Number.isSafeInteger(reference.order_number)||reference.order_number<1||reference.order_number>9999999999||
    typeof reference.message_id!=='string'||!Number.isFinite(Date.parse(reference.occurred_at)))
    throw Error('order_reference_invalid');
   const r=await client.rpc('crm_recovery_store_order_reference',{
    p_conversation_id:conversationId,p_message_id:reference.message_id,
    p_occurred_at:reference.occurred_at,p_order_number:reference.order_number});
   if(r.error||!['stored','duplicate'].includes(r.data))throw Error('order_reference_store_failed');
   return {stored:r.data==='stored'};
  },
  async read(conversationId) {
   const r=await client.rpc('crm_recovery_read_order_references',{p_conversation_id:conversationId});
   if(r.error||!Array.isArray(r.data)||r.data.length>1000)throw Error('order_reference_read_failed');
   const ids=new Set();
   for(const row of r.data) {
    if(Object.keys(row).some(k=>!['message_id','occurred_at','order_uuid','reference_status','resolution_status'].includes(k))||
      !(row.order_uuid===null||uuid(row.order_uuid))||typeof row.message_id!=='string'||ids.has(row.message_id)||
      typeof row.occurred_at!=='string'||!Number.isFinite(Date.parse(row.occurred_at))||row.reference_status!=='candidate'||
      !['matched','unmatched','conflict'].includes(row.resolution_status)||
      (row.resolution_status==='matched')!==(row.order_uuid!==null))throw Error('order_reference_row_invalid');
    ids.add(row.message_id);
   }
   return r.data;
  }
 };
}
