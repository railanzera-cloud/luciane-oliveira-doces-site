import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const migration=read("supabase/migrations/20261016133000_crocante_inventory_individual.sql");
const availability=read("app/menu-availability.ts");
const remote=read("lib/public-menu-availability.ts");
const admin=read("app/admin/page.tsx");
const adminClient=read("lib/menu-availability-client.ts");
const page=read("app/page.tsx");
const edge=read("supabase/functions/create-whatsapp-order/index.ts");

test("dois sabores sao estoque individual zerado e nao dependem da categoria Gourmet",()=>{
  assert.match(migration,/crocante_copo_ninho',0,true/);
  assert.match(migration,/crocante_copo_chocolate',0,true/);
  assert.match(migration,/update public.menu_availability[\s\S]*where item_key in \('crocante_copo_ninho','crocante_copo_chocolate'\)/);
  assert.doesNotMatch(migration,/update public.menu_availability[\s\S]*where item_key='category_pipocas'/);
  assert.match(availability,/quantities: Record<string, number>/);
});
test("checkout antigo tambem falha em estoque insuficiente, validado no banco",()=>{
  assert.match(migration,/after insert on public.order_items/);
  assert.match(migration,/from public.crocante_inventory[\s\S]*for update/);
  assert.match(migration,/v_inventory.total_stock - v_held < new.quantity/);
  assert.match(migration,/raise exception using errcode='23514',message='crocante_sem_estoque'/);
  assert.match(edge,/body\?\.message === "crocante_sem_estoque"/);
  assert.match(edge,/new HttpError\(409, "crocante_sem_estoque"/);
  assert.match(migration,/primary key\(order_uuid,item_key\)/);
});
test("frontend nao vende sem consultar o saldo publico, e bloqueia carrinhos acima do saldo",()=>{
  assert.match(remote,/rpc\/public_crocante_inventory/);
  assert.match(availability,/if \(count === 0\) statuses\[row\.item_key\] = "sold_out"/);
  assert.match(availability,/if \(!crocanteStock\.some/);
  assert.match(page,/const availableCount = snapshot\.quantities\[key\] \?\? 0/);
  assert.match(page,/cupQuantity \+ cupQuantityInCart <= selectedCupAvailable/);
  assert.match(page,/qty \+ otherQty > \(latest\.snapshot\.quantities/);
  assert.match(page,/selected \+ delta > \(availability\.quantities\[crocanteKey\]/);
});
test("painel exige autenticacao, valor inteiro e versao antes de salvar",()=>{
  assert.match(admin,/Copos Crocantes/);
  assert.match(admin,/loadCrocanteInventory\(\)/);
  assert.match(admin,/saveCrocanteInventory\(\{/);
  assert.match(adminClient,/admin_set_crocante_inventory/);
  assert.match(adminClient,/Number\.isInteger\(input\.total\)/);
  assert.match(migration,/perform public\.lod_require_authenticated_staff\(\)/);
  assert.match(migration,/if v_rec\.version <> p_version then/);
  assert.match(migration,/revoke all on public\.crocante_inventory from public,anon,authenticated/);
});
test("reservas so ocupam estoque antes do prazo; Pix tardio exige atendimento",()=>{
  assert.match(migration,/now\(\)\+interval '30 minutes'/);
  assert.match(migration,/state = 'held' and h\.expires_at > now\(\)/);
  assert.match(migration,/state='shortage'/);
  assert.match(migration,/lod_crocante_print_allocation_ready\(p_order\.id\)/);
  assert.match(migration,/if new\.order_status='cancelled'/);
  assert.match(admin,/pedido\(s\) pago\(s\) sem unidade reservada/);
});
