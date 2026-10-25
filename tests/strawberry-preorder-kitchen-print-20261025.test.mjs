import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const current=readFileSync("supabase/migrations/20261025165000_strawberry_preorder_kitchen_print.sql","utf8");
const prior=readFileSync("supabase/migrations/20261025154000_chocolate_morango_pre_reserva.sql","utf8");
test("exceção limitada às reservas de Chocolate com Morango de 25/10",()=>{
 assert.match(current,/2026-10-25 00:00:00-03/);
 assert.match(current,/2026-10-26 00:00:00-03/);
 assert.match(current,/PRÉ-RESERVA — Chocolate com Morango:/);
 assert.match(current,/slice_chocolate_morango/);
 assert.match(current,/a\.state='reserved'/);
 assert.match(current,/a\.quantity=\(/);
});
test("impressão por alocação idempotente e dependente de modo cozinha",()=>{
 assert.match(current,/AFTER INSERT ON public\.slice_preorder_allocations/);
 assert.match(current,/ON CONFLICT\(job_key\) DO NOTHING/);
 assert.match(current,/c\.enabled=true AND c\.auto_mode_enabled=true/);
 assert.match(current,/p_order\.payment_status IN \('pending','paid'\)/);
 assert.doesNotMatch(current,/UPDATE public\.orders SET/i);
 assert.doesNotMatch(current,/SET payment_status\s*=/i);
 assert.doesNotMatch(current,/UPDATE public\.slice_preorder_batches/i);
});
test("guardas históricos de pré-reserva e cozinha são mantidos",()=>{
 assert.match(prior,/IF NEW\.notes LIKE 'PRÉ-RESERVA/);
 assert.match(current,/lod_crocante_print_allocation_ready\(p_order\.id\)/);
 assert.match(current,/p_order\.payment_status NOT IN \('failed','cancelled','refunded'\)/);
 assert.match(current,/p_order\.sales_channel='site'/);
});
