import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("sinal Comprou do Tintim bloqueia novos lembretes sem marcar venda",()=>{
  const sql=read("supabase/migrations/20261026231500_crm_tintim_purchase_signal_guard.sql");
  assert.match(sql,/CREATE TRIGGER crm_purchase_signal_before_followup/);
  assert.match(sql,/crm_possible_purchase_review_required/);
  assert.match(sql,/crm_hold_tintim_purchase_signals/);
  assert.match(sql,/resolution_reason='tintim_purchase_signal'/);
  assert.match(sql,/crm_require_staff/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public.crm_list_tintim_signals/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public.crm_hold_tintim_purchase_signals/);
  assert.doesNotMatch(sql,/UPDATE public\.orders\b|INSERT INTO public\.orders\b|UPDATE public\.payment/i);
  assert.doesNotMatch(sql,/status='converted'|payment_status='paid'/);
});

test("CRM distingue referencia de anuncio, sinal de compra e mensagem real",()=>{
  const ui=read("components/admin-crm-panel.tsx");
  const css=read("components/admin-crm-panel.css");
  assert.match(ui,/crm_list_tintim_signals/);
  assert.match(ui,/crm_hold_tintim_purchase_signals/);
  assert.match(ui,/hasPurchaseSignal/);
  assert.match(ui,/possiblePurchase/);
  assert.match(ui,/Cadastro\/etapa Tintim atualizada/);
  assert.match(ui,/Indica o anúncio associado, não comprova qual produto/);
  assert.match(ui,/possiblePurchase\?"Possível compra"/);
  assert.match(ui,/item\.commercial_opt_out \|\| possiblePurchase/);
  assert.match(css,/crm-purchase-review/);
  assert.match(css,/crm-ad-signal/);
  assert.doesNotMatch(ui,/graph\.facebook\.com\/v\d+.*\/messages/);
});
