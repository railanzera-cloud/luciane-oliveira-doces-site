import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatAdminOrderItem } from "../lib/admin-order-item-display.ts";

const panel = readFileSync("components/admin-orders-panel.tsx", "utf8");
const source = readFileSync("lib/admin-order-item-display.ts", "utf8");

function item(quantity, name, size_label, option_names = []) {
  return { quantity, name, size_label, option_names };
}

test("Pedido #1396: duas fatias corretamente exibidas, sem alterar quantidade registrada", () => {
  const coco = formatAdminOrderItem(item(2, "Coco cremoso com geleia de morango na massa branca", "1 fatia", ["Com calda de chocolate"]));
  assert.deepEqual(coco, {
    title: "2x Coco Cremoso com Morango",
    detail: "2 fatias · Com calda de chocolate",
  });
  assert.equal(formatAdminOrderItem(item(1, "Prestígio", "1 fatia", ["Com calda de chocolate"])).detail, "1 fatia · Com calda de chocolate");
  assert.deepEqual(formatAdminOrderItem(item(1, "Chocolatudo", "1 fatia")), { title: "1x Chocolatudo", detail: "1 fatia" });
  assert.deepEqual(formatAdminOrderItem(item(3, "Chocolatudo", "1 fatia")), { title: "3x Chocolatudo", detail: "3 fatias" });
});

test("Outros produtos continuam com tamanhos e opções originais", () => {
  assert.deepEqual(formatAdminOrderItem(item(2, "Pipoca Gourmet", "750 ml", ["Ninho"])), { title: "2x Pipoca Gourmet — 750 ml", detail: "Ninho" });
  assert.deepEqual(formatAdminOrderItem(item(3, "Pipocas Trufadas", "Pacote", [])), { title: "3x Pipocas Trufadas — Pacote", detail: null });
  assert.deepEqual(formatAdminOrderItem(item(1, "Coca-Cola", null, [])), { title: "1x Coca-Cola", detail: null });
});

test("A apresentação do painel não toca na comanda nem na base de dados", () => {
  assert.match(panel, /formatAdminOrderItem\(item\)/);
  assert.match(panel, /<strong>\{display\.title\}<\/strong>/);
  assert.match(panel, /display\.detail && <span>\{display\.detail\}<\/span>/);
  assert.doesNotMatch(source, /update\(|\.rpc\(|fetch\(|print|payment_status|line_total/);
});
