import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261031105000_chocolate_morango_nova_pre_reserva.sql","utf8");
const page=readFileSync("app/page.tsx","utf8");
const checkout=readFileSync("app/order-checkout.ts","utf8");
test("previsão de 31/10 ao meio-dia vem do banco; nunca exibir a data antiga",()=>{
 assert.match(sql,/2026-10-31 12:00:00-03/);
 assert.match(sql,/2026-10-31 23:59:00-03/);
 assert.match(sql,/to_char\(\(v_preorder->>'ready_at'\)::timestamptz/);
 assert.match(page,/const strawberryReadyLabel/);
 assert.match(page,/timeZone: "America\/Belem"/);
 assert.match(page,/Pré-reserva · \{strawberryReadyLabel\}/);
 assert.doesNotMatch(page,/preparando mais 3 bolos/);
 assert.doesNotMatch(page,/por volta das 17h/);
 assert.doesNotMatch(checkout,/hoje por volta das 17h/);
});
test("reservas antigas nunca contaminam as unidades do novo lote",()=>{
 assert.match(sql,/ADD COLUMN IF NOT EXISTS batch_id uuid/);
 assert.match(sql,/NEW\.item_key <> 'slice_chocolate_morango'/);
 assert.match(sql,/v\.batch_id/);
 assert.match(sql,/v_batch\.batch_id IS NOT DISTINCT FROM v\.batch_id/);
 assert.match(sql,/public\.slice_preorder_allocations\.batch_id=excluded\.batch_id/);
 assert.match(sql,/capacity=0,reserved_units=0,external_reserved_units=0/);
 assert.match(sql,/enabled=false,updated_at=now\(\)/);
});
test("aceite automático seguro, pagamento intacto e impressão única",()=>{
 assert.match(sql,/v_order\.created_at < v_batch\.started_at/);
 assert.match(sql,/NOT public\.lod_kitchen_print_eligible\(v_order\)/);
 assert.match(sql,/UPDATE public\.orders[\s\S]*?order_status='confirmed'/);
 assert.match(sql,/v_order\.payment_status,v_order\.payment_status,'system',NULL/);
 assert.match(sql,/ON CONFLICT\(job_key\) DO NOTHING/);
 assert.doesNotMatch(sql,/SET payment_status\s*=/i);
 assert.doesNotMatch(sql,/SET paid_at\s*=/i);
});
