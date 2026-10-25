import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const migration=readFileSync("supabase/migrations/20261025163500_strawberry_preorder_external_units.sql","utf8");
const page=readFileSync("app/page.tsx","utf8");
const admin=readFileSync("app/admin/page.tsx","utf8");
const component=readFileSync("components/admin-strawberry-preorder.tsx","utf8");
const checkout=readFileSync("app/order-checkout.ts","utf8");

test("vitrine divulga oferta limitada sem contador numérico",()=>{
  assert.match(page,/Produção limitada para hoje · R\$ 22 por fatia/);
  assert.doesNotMatch(page,/\{strawberryPreorder\.remaining\} \{strawberryPreorder\.remaining===1/);
  assert.match(page,/strawberryPreorder\.remaining > 0/);
  assert.match(page,/Pré-reservas esgotadas para hoje/);
  assert.match(checkout,/PRÉ-RESERVA PARA HOJE — CHOCOLATE COM MORANGO/);
});

test("painel separa reserva automática de venda externa manual",()=>{
  assert.match(admin,/AdminStrawberryPreorder/);
  assert.match(admin,/preorderActive=\{item\.itemKey==="slice_chocolate_morango"/);
  assert.match(admin,/Encerre primeiro o lote de pré-reserva/);
  assert.match(component,/stock\.site_reserved/);
  assert.match(component,/stock\.external_reserved/);
  assert.match(component,/stock\.remaining/);
  assert.match(component,/admin_set_strawberry_external_units/);
  assert.match(component,/p_expected_units:stock\.external_reserved/);
  assert.match(component,/Informe o total acumulado/);
  assert.doesNotMatch(component,/insert\(|order_items|payment_status|print_jobs/);
});

test("banco considera vendas externas no mesmo limite atômico das reservas do site",()=>{
  assert.match(migration,/external_reserved_units integer NOT NULL DEFAULT 0/);
  assert.match(migration,/reserved_units \+ external_reserved_units <= capacity/);
  assert.match(migration,/b\.capacity-b\.reserved_units-b\.external_reserved_units/);
  assert.match(migration,/v\.capacity-v\.reserved_units-v\.external_reserved_units<NEW\.quantity/);
  assert.match(migration,/WHERE item_key=NEW\.item_key FOR UPDATE/);
  assert.match(migration,/p_new_units>v\.capacity-v\.reserved_units/);
  assert.match(migration,/external_units_changed_refresh/);
  assert.match(migration,/INSERT INTO public\.slice_preorder_external_audit/);
});

test("operações externas protegidas, sem acesso anônimo nem alterar faturamento",()=>{
  assert.match(migration,/public\.lod_require_authenticated_staff\(\)/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.admin_set_strawberry_external_units\(integer,integer\) FROM PUBLIC,anon,authenticated/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.admin_set_strawberry_external_units\(integer,integer\) TO authenticated/);
  assert.match(migration,/ALTER TABLE public\.slice_preorder_external_audit ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(migration,/UPDATE public\.orders/);
  assert.doesNotMatch(migration,/UPDATE public\.order_items/);
  assert.doesNotMatch(migration,/SET payment_status/);
});
