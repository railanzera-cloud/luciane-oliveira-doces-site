import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration=await readFile(new URL("../supabase/migrations/20261018164000_kitchen_trufadas_reserved_print.sql",import.meta.url),"utf8");
const old=await readFile(new URL("../supabase/migrations/20261017233000_kitchen_auto_mode_optin.sql",import.meta.url),"utf8");
const qz=await readFile(new URL("../lib/qz-print-client.ts",import.meta.url),"utf8");
const panel=await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url),"utf8");

test("hotfix altera somente elegibilidade de reserva, sem mutações em pedidos ou estoque",()=>{
  assert.match(migration,/CREATE OR REPLACE FUNCTION public\.lod_crocante_print_allocation_ready\(p_order_uuid uuid\)/);
  assert.match(migration,/RETURNS boolean[\s\S]*LANGUAGE sql STABLE SECURITY DEFINER/);
  assert.doesNotMatch(migration,/\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER)\b\s+(FROM\s+|INTO\s+)?public\./i);
  assert.doesNotMatch(migration,/^\\s*(?:REVOKE|GRANT)\\b/im);
  assert.doesNotMatch(migration,/payment_status\s*=/i);
});
test("impede estoque inexistente, reserva insuficiente, cancelada ou expirada",()=>{
  assert.match(migration,/JOIN public\.crocante_inventory inv ON inv\.item_key = i\.item_key/);
  assert.match(migration,/SUM\(i\.quantity\)::bigint AS needed/);
  assert.match(migration,/h\.quantity >= r\.needed/);
  assert.match(migration,/h\.state = 'committed'/);
  assert.match(migration,/h\.state = 'held'/);
  assert.match(migration,/h\.expires_at > now\(\)/);
  assert.match(migration,/WHERE NOT EXISTS \(/);
  assert.match(migration,/o\.order_status IN \('confirmed','preparing','ready'/);
  assert.match(migration,/o\.payment_status = 'pending'/);
});
test("reserva temporária impressa só no modo cozinha explicitamente ativado",()=>{
  assert.match(migration,/o\.sales_channel = 'whatsapp'/);
  assert.match(migration,/o\.payment_method IN \('manual_pix','cash','card_on_delivery'\)/);
  assert.match(migration,/ctl\.enabled = true/);
  assert.match(migration,/ctl\.auto_mode_enabled = true/);
  assert.match(migration,/o\.created_at >= ctl\.auto_mode_started_at/);
  assert.match(migration,/o\.created_at >= ctl\.accept_new_after/);
  assert.match(old,/auto_mode_enabled boolean NOT NULL DEFAULT false/);
});
test("mantém versão recente do painel, comanda premium, QZ e mensagens",()=>{
  assert.match(qz,/installKitchenQzSecurity/);
  assert.match(qz,/PEDIDO CONFIRMADO/);
  assert.match(qz,/ENDERECO DE ENTREGA/);
  assert.match(panel,/Modo Cozinha/);
  assert.match(panel,/Ligar automático/);
  assert.match(panel,/Manter tela ativa durante a cozinha/);
  const checkout=await readFile(new URL("../app/order-checkout.ts",import.meta.url),"utf8");
  assert.match(checkout,/isTrufada && item\.size\.trim\(\)\.toLowerCase\(\) === "pacote"/);
});
