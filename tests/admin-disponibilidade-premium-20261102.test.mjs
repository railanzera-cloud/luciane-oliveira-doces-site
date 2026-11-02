import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  freePackages, prepareTrufadasStockTotal, stockSnapshotChanged,
} from "../lib/trufadas-stock-calculation.mjs";

const admin = readFileSync("app/admin/page.tsx", "utf8");
const stock = readFileSync("components/admin-trufadas-stock.tsx", "utf8");
const css = readFileSync("app/admin/availability.css", "utf8");
const sql = readFileSync("supabase/migrations/20261101160000_trufadas_pmg_nove_skus_20261101.sql", "utf8");

test("Estoque livre: uma unidade já comprometida não deve ser liberada novamente", () => {
  assert.equal(freePackages({ total: 1, reserved: 1 }), 0);
  assert.deepEqual(prepareTrufadasStockTotal("0", 1), { free: 0, total: 1 });
  assert.deepEqual(prepareTrufadasStockTotal("1", 1), { free: 1, total: 2 });
  assert.deepEqual(prepareTrufadasStockTotal("3", 2), { free: 3, total: 5 });
  assert.deepEqual(prepareTrufadasStockTotal(" 4 ", 0), { free: 4, total: 4 });
});

test("Editor rejeita entradas inseguras sem permitir que reservas sejam descontadas duas vezes", () => {
  for (const input of ["", "-1", "1.5", "3,5", "1e3", "Infinity", "abc", "100001"]) {
    assert.equal(prepareTrufadasStockTotal(input, 0), null, input);
  }
  assert.equal(prepareTrufadasStockTotal("99999", 2), null);
  assert.deepEqual(prepareTrufadasStockTotal("99999", 1), { free: 99999, total: 100000 });
  assert.equal(prepareTrufadasStockTotal("1", -1), null);
  assert.equal(prepareTrufadasStockTotal("1", 0.5), null);
  assert.equal(prepareTrufadasStockTotal("9007199254740992", 0), null);
});

test("Conferência antes da escrita detecta reservas ou estoque alterados", () => {
  const row = { version: 7, reserved: 1, total: 2, enabled: true };
  assert.equal(stockSnapshotChanged(row, { ...row }), false);
  assert.equal(stockSnapshotChanged(row, { ...row, reserved: 2 }), true);
  assert.equal(stockSnapshotChanged(row, { ...row, version: 8 }), true);
  assert.equal(stockSnapshotChanged(row, { ...row, total: 4 }), true);
  assert.equal(stockSnapshotChanged(row, { ...row, enabled: false }), true);
  assert.equal(stockSnapshotChanged(row, undefined), true);
  assert.match(stock, /admin_get_trufadas_pmg_inventory/);
  assert.match(stock, /stockSnapshotChanged\(row, current\)/);
  assert.match(stock, /p_total: total/);
  assert.match(stock, /p_version: row\.version/);
  assert.match(stock, /p_enabled: draft\.enabled/);
  assert.match(sql, /p_total<v_held/);
  assert.match(sql, /v_rec\.version<>p_version/);
});

test("Disponibilidade tem três áreas sem empilhar todas as categorias", () => {
  assert.match(admin, /availabilitySection, setAvailabilitySection/);
  assert.match(admin, /"trufadas" \| "gourmet" \| "fatias"/);
  assert.match(admin, /admin-availability-tab-trufadas/);
  assert.match(admin, /admin-availability-tab-gourmet/);
  assert.match(admin, /admin-availability-tab-fatias/);
  assert.match(admin, /availabilitySection === "trufadas"/);
  assert.match(admin, /availabilitySection === "gourmet"/);
  assert.match(admin, /availabilitySection === "fatias"/);
  assert.match(admin, /MENU_AVAILABILITY_ITEMS/);
  assert.match(admin, /AdminStrawberryPreorder/);
  assert.match(admin, /CATEGORY_ITEM_KEYS\.pipocas/);
  assert.match(admin, /Pipocas · Gourmet e Trufadas/);
  assert.match(admin, /\[item\.itemKey\]: previousStatus/);
  assert.match(admin, /pendingKeys\.includes\(item\.itemKey\)/);
});

test("Trufadas orienta a Luciane sem registrar pedidos como pagos", () => {
  assert.match(stock, /TRUFADAS_VARIANTS/);
  assert.match(stock, /TRUFADAS_SIZES/);
  assert.match(stock, /admin-stock-flavors/);
  assert.match(stock, /admin-stock-variants/);
  assert.match(stock, /Pacotes livres para novos pedidos/);
  assert.match(stock, /Em pedidos/);
  assert.match(stock, /não que o pagamento foi confirmado/);
  assert.match(stock, /A confirmação do pagamento continua no painel Pedidos/);
  assert.doesNotMatch(stock, /payment_status\s*:\s*"paid"/);
  assert.match(stock, /chooseVariant/);
  assert.match(stock, /Alteração ainda não salva/);
  assert.match(stock, /onChanged\?\.\(\)/);
  assert.doesNotMatch(stock, /service_role/);
});

test("Novo layout respeita mobilidade, contraste, foco e não afeta outros painéis", () => {
  assert.match(css, /\.admin-availability-nav/);
  assert.match(css, /\.admin-compact-grid/);
  assert.match(css, /\.admin-stock-editor/);
  assert.match(css, /\.admin-stock-variants > button\.is-current/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:440px\)/);
  assert.match(css, /@media \(max-width:355px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(admin, /AdminOrdersPanel/);
  assert.match(admin, /AdminResultsPanel/);
  assert.match(admin, /AdminCrmPanel/);
  assert.match(admin, /import "\.\/availability\.css"/);
});
