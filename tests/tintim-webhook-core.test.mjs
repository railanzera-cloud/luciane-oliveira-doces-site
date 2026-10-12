import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTintimPayload } from '../supabase/functions/tintim-webhook/core.mjs';
const t = '2026-10-12T12:00:00Z';
test('preserves campaign and source without message body', () => {
 const r=normalizeTintimPayload({event_type:'lead.update',lead:{phone:'(91) 99999-8888',name:'Teste'},ad:{campaign_id:'77'},visit:{url:'https://example.com/?utm_source=ig&fbclid=X'},message:'private'},t);
 assert.equal(r.summary.campaign_id,'77');assert.equal(r.summary.phone_digits,'91999998888');
 assert.equal(r.summary.visit_parameters.utm_source,'ig');
 assert.equal(r.lead_key,null);assert.ok(!JSON.stringify(r).includes('private'));
});
test('uses explicit conversation ID if present',()=>{
 const r=normalizeTintimPayload({event_type:'lead.update',lead:{phone:'91999998888'},conversation:{uuid:'uuid-123'}},t);
 assert.equal(r.lead_key,'uuid-123');
});
test('ignores message events',()=>{
 assert.equal(normalizeTintimPayload({event_type:'message.create',message:'body'},t).ignored,true);
});