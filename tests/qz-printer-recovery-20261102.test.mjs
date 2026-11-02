import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { chooseKitchenPrinter } from "../lib/qz-printer-selection.mjs";

const qz = readFileSync("lib/qz-print-client.ts", "utf8");
const panel = readFileSync("components/admin-orders-panel.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("QZ: mantém impressora aprovada quando está presente, sem escolher outra", () => {
  assert.equal(chooseKitchenPrinter(["POS-58","Microsoft Print to PDF"],"POS-58",undefined,null),"POS-58");
  assert.equal(chooseKitchenPrinter(["POS-58"],"pos-58",undefined,null),"POS-58");
  assert.equal(chooseKitchenPrinter(["  POS-58  "],"POS-58",undefined,null),"  POS-58  ");
});
test("QZ: substitui nome antigo somente quando detecta UMA POS-58 real", () => {
  assert.equal(chooseKitchenPrinter(["POS-58 USB","Microsoft Print to PDF"],"POS-58 antiga",undefined,null),"POS-58 USB");
  assert.equal(chooseKitchenPrinter(["XP-58 USB"],"POS-58",undefined,null),"XP-58 USB");
  assert.throws(()=>chooseKitchenPrinter(["POS-58 USB","POS-58 rede"],"POS-58 antiga",undefined,null),/Selecione uma/);
  assert.throws(()=>chooseKitchenPrinter(["Microsoft Print to PDF","Impressora fiscal"],"POS-58 antiga",undefined,null),/Selecione uma/);
});
test("QZ: escolha manual não deve aceitar nome inexistente ou aproximado", () => {
  assert.equal(chooseKitchenPrinter(["POS-58 USB","PDF"],"POS-58 antiga","POS-58 USB",null),"POS-58 USB");
  assert.throws(()=>chooseKitchenPrinter(["POS-58 USB"],"POS-58 antiga","POS-58",null),/não aparece mais/);
  assert.equal(chooseKitchenPrinter(["POS-58 USB"],"POS-58 antiga","pos-58 usb",null),"POS-58 USB");
});
test("QZ: primeira conexão conserva padrão do Windows e não imprime sem escolha segura", () => {
  assert.equal(chooseKitchenPrinter(["POS-58 USB","PDF"],"",undefined,"POS-58 USB"),"POS-58 USB");
  assert.equal(chooseKitchenPrinter(["Impressora térmica padrão"],"",undefined,"Impressora térmica padrão"),"Impressora térmica padrão");
  assert.throws(()=>chooseKitchenPrinter(["PDF","Impressora fiscal"],"",undefined,null),/Escolha a POS-58/);
});
test("QZ: recuperação não dispara impressão no diagnóstico nem altera pagamento", () => {
  assert.match(qz,/qz\.printers\.find\(\)/);
  assert.match(qz,/discoveredPrinters = \[\]/);
  assert.match(qz,/chooseKitchenPrinter\(discoveredPrinters, saved, preferredPrinter, defaultPrinter\)/);
  assert.match(qz,/getDiscoveredKitchenPrinters/);
  assert.match(panel,/detectedPrinters/);
  assert.match(panel,/printerChoice/);
  assert.match(panel,/Usar esta impressora e verificar pendências/);
  assert.match(panel,/Nenhuma comanda foi enviada|Confira se o QZ Tray está aberto/);
  assert.match(panel,/if \(!printerReady \|\| !printerOnline\)/);
  assert.match(panel,/\.eq\("kind", "initial"\)\.eq\("status", "printed"\)/);
  assert.doesNotMatch(qz,/confirmOfflinePayment/);
  assert.match(css,/admin-kitchen-printer-recovery/);
});
