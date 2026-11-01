import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const admin=readFileSync("components/admin-trufadas-stock.tsx","utf8");
const menu=readFileSync("app/menu-availability.ts","utf8");
const page=readFileSync("app/page.tsx","utf8");
const migration=readFileSync("supabase/migrations/20261101160000_trufadas_pmg_nove_skus_20261101.sql","utf8");
test("Admin: nove pacotes agrupados logicamente por sabor e tamanho",()=>{
  assert.match(admin,/TRUFADAS_VARIANTS/);
  assert.match(admin,/TRUFADAS_SIZES/);
  assert.match(admin,/admin_get_crocante_inventory/);
  assert.match(admin,/admin_set_crocante_inventory/);
  assert.match(admin,/p_version: row.version/);
  assert.match(admin,/p_item_key: row.item_key/);
  assert.match(admin,/p_enabled: draft.enabled/);
  assert.match(admin,/total < row.reserved/);
  assert.doesNotMatch(admin,/Caramelo e Chocolate/);
});
test("DB: migração inicia estoque zero/desativado e preserva legado",()=>{
  assert.equal((migration.match(/'trufada_(?:ninho|pacoca|coco_queimado)_[pmg]',0,false/g)||[]).length,9);
  assert.match(migration,/crocante_copo_chocolate/);
  assert.match(migration,/crocante_copo_ninho/);
  assert.match(migration,/BEGIN;/);
  assert.match(migration,/COMMIT;/);
  assert.match(migration,/FOR UPDATE/);
});
test("Estoque não permite escolher quantidade de tamanho diverso",()=>{
  assert.match(menu,/trufadaStockItemKey/);
  assert.match(page,/entry\.variantId === item\.variantId/);
  assert.match(page,/stockRemaining\[exactKey\]/);
  assert.match(page,/!latest\.snapshot\.stockChecked/);
});
