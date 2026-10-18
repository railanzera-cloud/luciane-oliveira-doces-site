import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync("supabase/migrations/20261018222000_trufadas_stocktake_cutoff_stability.sql","utf8");

test("Ajuste normal de estoque não apaga as reservas criadas após marco físico",()=>{
  assert.match(migration,/last_physical_recount_at=v_rec\.last_physical_recount_at/);
  assert.doesNotMatch(migration,/last_physical_recount_at\s*=\s*clock_timestamp\(\)/);
  assert.match(migration,/version=version\+1/);
  assert.match(migration,/v_rec\.version<>p_version/);
  assert.match(migration,/public\.lod_crocante_active_reserved\(p_item_key\)/);
});
test("Reserva vencida não é reativada se quantidade já foi comprada por outro pedido",()=>{
  assert.match(migration,/v_other_held:=public\.lod_crocante_active_reserved\(v_hold\.item_key,new\.id\)/);
  assert.match(migration,/IF v_inventory\.total_stock-v_other_held>=v_hold\.quantity THEN[\s\S]*expires_at='infinity'::timestamptz/);
  assert.match(migration,/ELSE[\s\S]*SET state='shortage',updated_at=now\(\)/);
  assert.match(migration,/v_should_consume := new\.payment_status='paid' OR new\.order_status='completed'/);
  assert.doesNotMatch(migration,/\bUPDATE public\.orders\s+SET\b/);
});
test("Encerramento financeiro permanece separado da aceitação operacional",()=>{
  assert.doesNotMatch(migration,/SET payment_status\s*=/);
  assert.doesNotMatch(migration,/SET paid_at\s*=/);
  assert.match(migration,/v_hold\.created_at<=v_inventory\.last_physical_recount_at/);
  assert.match(migration,/v_hold\.state='held'/);
});
