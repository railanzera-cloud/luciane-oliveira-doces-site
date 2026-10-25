import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261025204000_strawberry_preorder_auto_accept.sql","utf8");
const prior=readFileSync("supabase/migrations/20261025165000_strawberry_preorder_kitchen_print.sql","utf8");
test("só reservas efetivas de hoje passam pela confirmação automática",()=>{
 assert.match(sql,/NEW\.item_key <> 'slice_chocolate_morango'/);
 assert.match(sql,/NEW\.state <> 'reserved'/);
 assert.match(sql,/2026-10-25 00:00:00-03/);
 assert.match(sql,/now\(\) >= '2026-10-26 00:00:00-03'/);
 assert.match(sql,/PRÉ-RESERVA — Chocolate com Morango:/);
 assert.match(sql,/v_order\.sales_channel <> 'whatsapp'/);
 assert.match(sql,/lod_kitchen_print_eligible\(v_order\)/);
});
test("novo passa a confirmado antes de entrar na fila, sem marcar pago",()=>{
 assert.match(sql,/IF v_order\.order_status='new' THEN/);
 assert.match(sql,/UPDATE public\.orders[\s\S]*?order_status='confirmed'/);
 assert.match(sql,/WHERE id=v_order\.id AND order_status='new'/);
 assert.match(sql,/INSERT INTO public\.order_status_history/);
 assert.match(sql,/v_order\.payment_status,v_order\.payment_status,'system',NULL/);
 assert.doesNotMatch(sql,/SET payment_status\s*=/i);
 assert.doesNotMatch(sql,/SET paid_at\s*=/i);
 assert.doesNotMatch(sql,/UPDATE public\.slice_preorder_batches/i);
 assert.ok(sql.indexOf("UPDATE public.orders")<sql.indexOf("INSERT INTO public.print_jobs"));
});
test("comanda idempotente e sem reimpressão",()=>{
 assert.match(sql,/ON CONFLICT\(job_key\) DO NOTHING/);
 assert.match(sql,/c\.enabled=true AND c\.auto_mode_enabled=true/);
 assert.match(sql,/v_order\.created_at >= c\.auto_mode_started_at/);
 assert.match(prior,/AFTER INSERT ON public\.slice_preorder_allocations/);
 assert.doesNotMatch(sql,/kind,'reprint'/);
});
