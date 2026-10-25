import assert from "node:assert/strict";import test from "node:test";import {readFileSync} from "node:fs";
const s=readFileSync("supabase/migrations/20261025154500_strawberry_preorder_guard.sql","utf8");
test("Não permitir habilitar venda imediata enquanto existe lote habilitado",()=>{
 assert.match(s,/NEW.item_key='slice_chocolate_morango'/);
 assert.match(s,/NEW.status='available'/);
 assert.match(s,/b.enabled=true/);
 assert.match(s,/message='slice_preorder_active'/);
 assert.match(s,/BEFORE UPDATE OF status ON public.menu_availability/);
});