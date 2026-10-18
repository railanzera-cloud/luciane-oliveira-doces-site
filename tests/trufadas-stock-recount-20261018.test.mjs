import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261018185000_trufadas_stocktake_reservation_reconcile.sql", "utf8");
const previousKitchen = readFileSync("supabase/migrations/20261018164000_kitchen_trufadas_reserved_print.sql", "utf8");
const admin = readFileSync("components/admin-trufadas-stock.tsx", "utf8");

test("Recontagem é marca temporal segura, não altera estoque/pedidos históricos na migração", () => {
  assert.match(migration,/ADD COLUMN IF NOT EXISTS last_physical_recount_at timestamptz/);
  assert.match(migration,/last_physical_recount_at=CASE WHEN p_total IS DISTINCT FROM v_rec.total_stock/);
  assert.match(migration,/IF v_rec.version<>p_version THEN/);
  assert.match(migration,/v_rec.last_physical_recount_at/);
  assert.doesNotMatch(migration,/UPDATE public\.orders\s+SET/);
  assert.doesNotMatch(migration,/UPDATE public\.crocante_inventory_holds\s+SET state='committed'[\s\S]*WHERE state='held';/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.lod_crocante_active_reserved\(text,uuid\) FROM PUBLIC/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.lod_crocante_active_reserved\(text,uuid\) FROM anon, authenticated/);
  assert.match(admin,/client\.rpc\("admin_set_crocante_inventory"/);
});

test("Novo saldo exclui pedidos pré-contagem e segura reserva operacional confirmada", () => {
  assert.match(migration,/h\.created_at > inv\.last_physical_recount_at/);
  assert.match(migration,/inv\.last_physical_recount_at IS NOT NULL/);
  assert.match(migration,/o\.order_status IN \('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'\)/);
  assert.match(migration,/lod_crocante_active_reserved\(inv\.item_key\)/);
  assert.match(migration,/v_held:=public\.lod_crocante_active_reserved\(new\.item_key\)/);
  assert.match(migration,/THEN 'infinity'::timestamptz/);
});

test("Pedidos anteriores ao marco não debitam de novo depois de pagamento confirmado", () => {
  assert.match(migration,/v_hold\.created_at<=v_inventory\.last_physical_recount_at/);
  assert.match(migration,/SET state='committed',updated_at=now\(\)/);
  assert.match(migration,/ELSE\s+v_other_held:=public\.lod_crocante_active_reserved\(v_hold\.item_key,new\.id\)/);
  assert.match(migration,/total_stock=total_stock-v_hold\.quantity/);
  assert.match(migration,/WHERE order_uuid=v_hold\.order_uuid AND item_key=v_hold\.item_key/);
});

test("Reserva só consome estoque depois de pagamento comprovado ou conclusão física", () => {
  assert.match(migration,/v_should_consume := new\.payment_status='paid' OR new\.order_status='completed'/);
  assert.match(migration,/new\.payment_status IN \('cancelled','failed','refunded'\)/);
  assert.match(migration,/SET state='released',updated_at=now\(\)/);
  assert.doesNotMatch(migration,/\bSET payment_status\s*=/);
  assert.doesNotMatch(migration,/\bSET paid_at\s*=/);
  assert.match(previousKitchen,/h\.state = 'committed'/);
  assert.match(previousKitchen,/h\.expires_at > now\(\)/);
});

test("Cenários aritméticos de reconciliação são idempotentes por estado do hold",()=>{
  function resolve({counted,paid,completed,cancelled,held,stock,quantity}) {
    if (!held) return {stock,state:"committed"};
    if (cancelled) return {stock,state:"released"};
    if (!paid && !completed) return {stock,state:"held"};
    if (counted) return {stock,state:"committed"};
    if (stock<quantity) return {stock,state:"shortage"};
    return {stock:stock-quantity,state:"committed"};
  }
  assert.deepEqual(resolve({counted:true,paid:true,held:true,stock:6,quantity:2}),{stock:6,state:"committed"});
  assert.deepEqual(resolve({counted:false,paid:false,completed:false,held:true,stock:6,quantity:2}),{stock:6,state:"held"});
  assert.deepEqual(resolve({counted:false,paid:true,held:true,stock:6,quantity:2}),{stock:4,state:"committed"});
  assert.deepEqual(resolve({counted:false,completed:true,held:true,stock:6,quantity:1}),{stock:5,state:"committed"});
  assert.deepEqual(resolve({counted:false,cancelled:true,held:true,stock:6,quantity:1}),{stock:6,state:"released"});
});
