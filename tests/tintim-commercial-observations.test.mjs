import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeTintimPayload, parseTintimReportedAmount } from '../supabase/functions/tintim-webhook/core.mjs';

const now = '2026-10-12T21:00:00Z';

test('Tintim realista: status.name Comprou e valor manual são observados sem declarar pagamento', () => {
  const r = normalizeTintimPayload({
    event_type:'lead.update', status:{id:7,name:'Comprou'},
    sale_amount:58.50, updated_isoformat:'2026-10-12T20:58:00Z',
    lead:{id:'lead-test',phone:'91999998888',name:'Teste'},
    message:'Mensagem particular, senha e documento privados',
  },now);
  assert.equal(r.ignored,false);
  assert.equal(r.event_type,'lead_update');
  assert.equal(r.summary.stage,'Comprou');
  assert.equal(r.summary.stage_id,'7');
  assert.equal(r.summary.sale_amount,58.50);
  assert.equal(r.summary.sale_amount_from_message,null);
  assert.equal(r.observed_at,'2026-10-12T20:58:00.000Z');
  assert.ok(!JSON.stringify(r).includes('Mensagem particular'));
});

test('valor automático no corpo do Tintim tem campo próprio, sem buscar texto da mensagem', () => {
  const r=normalizeTintimPayload({
    event_type:'lead.update',status:{name:'Comprou'},
    sale_amount_from_message:'R$ 1.234,56',
    message:{text:'Compra, telefone e CPF que não devem ser salvos'},
  },now);
  assert.equal(r.summary.sale_amount,null);
  assert.equal(r.summary.sale_amount_from_message,1234.56);
  assert.equal(r.summary.stage,'Comprou');
  assert.ok(!JSON.stringify(r).includes('CPF'));
});

test('dois campos positivos são preservados separados e sem inferência de precedência', () => {
  const r=normalizeTintimPayload({
    event_type:'lead.update', status:{name:'Comprou'},
    sale_amount:50,sale_amount_from_message:60,
  },now);
  assert.equal(r.summary.sale_amount,50);
  assert.equal(r.summary.sale_amount_from_message,60);
});

test('preços brasileiros e numéricos explícitos sem criar valores inválidos', () => {
  assert.equal(parseTintimReportedAmount(20),20);
  assert.equal(parseTintimReportedAmount('R$ 20,00'),20);
  assert.equal(parseTintimReportedAmount('1.234'),1234);
  assert.equal(parseTintimReportedAmount('1.234,56'),1234.56);
  assert.equal(parseTintimReportedAmount('25.90'),25.90);
  for(const value of [null,undefined,'','R$ vinte','20 ou 30','R$ 0',-2,0,NaN,Infinity,10000001,'1,23,45'])
    assert.equal(parseTintimReportedAmount(value),null,String(value));
});

test('etapa de atendimento não vira venda por suposição', () => {
  const r=normalizeTintimPayload({event_type:'lead.update',status:{name:'Em atendimento'}},now);
  assert.equal(r.summary.stage,'Em atendimento');
  assert.equal(r.summary.sale_amount,null);
  assert.equal(r.summary.sale_amount_from_message,null);
});

test('formatos já usados para origem de campanha permanecem aceitos', () => {
  const r=normalizeTintimPayload({
    event_type:'lead.source.update',
    lead:{phone:'91999998888'},ad:{campaign_name:'Morango'},
    visit:{url:'https://example.com/?utm_source=ig&fbclid=abc'},
  },now);
  assert.equal(r.event_type,'lead_source_update');
  assert.equal(r.summary.campaign_name,'Morango');
  assert.equal(r.summary.visit_parameters.fbclid,'abc');
});

test('banco captura somente lead_update, preserva recibo idempotente e nunca altera pagamento', async () => {
  const sql=await readFile(new URL('../supabase/migrations/20261012235500_tintim_commercial_observations.sql',import.meta.url),'utf8');
  assert.match(sql,/NEW\.event_type <> 'lead_update'/);
  assert.match(sql,/PRIMARY KEY REFERENCES public\.tintim_webhook_receipts\(id\)/);
  assert.match(sql,/ON CONFLICT\(receipt_id\) DO NOTHING/);
  assert.match(sql,/reported_amount_source IN \('none','manual_or_default','from_message','ambiguous_both_fields'\)/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.tintim_commercial_observations FROM PUBLIC,anon,authenticated/);
  assert.ok(!/UPDATE\s+public\.orders|INSERT\s+INTO\s+public\.orders|purchase_event|meta_capi|confirm_payment/i.test(sql));
});

test('observação comercial não captura texto de mensagem no webhook',async () => {
  const core=await readFile(new URL('../supabase/functions/tintim-webhook/core.mjs',import.meta.url),'utf8');
  assert.ok(core.includes('sale_amount_from_message:parseTintimReportedAmount'));
  assert.ok(core.includes('stage:first(stage.name,status.name'));
  assert.ok(!core.includes('summary:{ message:'));
});
