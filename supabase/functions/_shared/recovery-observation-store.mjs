import { classifyRecoveryInterest, recoveryCatalog, RECOVERY_VERSION } from './recovery-interest.mjs';
// Internal adapter only. No route or active webhook imports this module.
export function privateRecoveryObservations(client) {
  return {
    async capture(conversationId,event) {
      if (event?.verified !== true || event.direction !== 'inbound' ||
        event.time_basis !== 'provider_timestamp' ||
        event.content_origin !== 'customer_text' || event.conversation_key !== conversationId)
        return {stored:false,reason:'unverified_observation'};
      const semantic = classifyRecoveryInterest(event.text);
      const r = await client.rpc('crm_recovery_store_observation',{
        p_conversation_id:conversationId,p_message_id:event.id,p_occurred_at:event.occurred_at,p_semantic:semantic});
      if (r.error) throw new Error('private_observation_write_failed');
      return {stored:r.data === true,reason:r.data === true ? 'stored' : 'duplicate'};
    },
    async read(conversationId) {
      const r = await client.rpc('crm_recovery_read_observations',{p_conversation_id:conversationId});
      if (r.error || !Array.isArray(r.data) || r.data.length>1000) throw new Error('private_observation_read_failed');
      const catalog = recoveryCatalog();
      for (const row of r.data) {
        const s = row.semantic;
        if (s?.version !== RECOVERY_VERSION || !Array.isArray(s.candidates) ||
          s.candidates.some(p => !catalog.some(c => c.product_id===p.product_id && c.category===p.category && c.option_id===p.option_id)))
          throw new Error('private_observation_version_invalid');
      }
      return r.data;
    },
  };
}
