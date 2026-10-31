import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const helper=readFileSync("app/last-slices-campaign.ts","utf8");
const page=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/globals.css","utf8");
const compiled=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const helperModule=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));
test("campanha somente 31/10, ate 20h no fuso America/Belem",()=>{
 const {isLastSlicesWindow}=helperModule;
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T20:54:00Z")),true); // 17:54 em Paragominas
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T22:59:59Z")),true); // 19:59:59
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T23:00:00Z")),false); // 20:00
 assert.equal(isLastSlicesWindow(new Date("2026-10-30T22:59:59Z")),false);
 assert.equal(isLastSlicesWindow(new Date("2026-11-01T10:00:00Z")),false);
 assert.equal(isLastSlicesWindow(new Date("not-a-date")),false);
});
test("so Chocolate com Morango e Prestigio, sem confundir com Ninho/Coco",()=>{
 assert.deepEqual([...helperModule.LAST_SLICES_PRODUCT_IDS],["fatia-chocolate-morango","fatia-prestigio"]);
 assert.match(page,/LAST_SLICES_PRODUCT_IDS\.some/);
 assert.match(page,/activeCategory === "fatias"/);
 assert.match(page,/!strawberryPreorder/);
 assert.match(page,/sliceIsAvailable\(slice\.id\)/);
 assert.match(page,/availability\.ordersOpen/);
 assert.match(page,/availability\.source === "supabase"/);
});
test("copy honesta: sem estoque falso, demanda ficticia ou oferta de desconto",()=>{
 assert.match(page,/ÚLTIMAS FATIAS DE HOJE/);
 assert.match(page,/Pedidos até 20h ou enquanto houver disponibilidade/);
 assert.match(page,/Oferta de disponibilidade, sem desconto/);
 assert.match(page,/lastSlicesProducts\.map/);
 assert.doesNotMatch(page,/5 unidades restantes|cinco unidades restantes/);
 assert.doesNotMatch(page,/centenas de pedidos|mais vendidos de hoje|vendendo agora/i);
});
test("botoes selecionam produto com preco real e seguem ao configurador",()=>{
 assert.match(page,/lastSlicesProducts\.map\(\(slice\) => <button type="button"/);
 assert.match(page,/setSliceProductId\(slice\.id\)/);
 assert.match(page,/setSliceOptionId\(""\)/);
 assert.match(page,/requestScroll\("calda-fatias"\)/);
 assert.match(page,/currency\.format\(slice\.variants\[0\]\.price\)/);
 assert.match(page,/lastSlicesIds\.has\(slice\.id\) && available/);
});
test("interface responsiva e acessivel, sem tocar no processo de impressao",()=>{
 assert.match(css,/\.storefront \.last-slices-banner/);
 assert.match(css,/\.storefront \.last-slices-action:focus-visible/);
 assert.match(css,/@media \(max-width: 580px\)/);
 assert.match(page,/aria-label="Últimas fatias disponíveis hoje"/);
 assert.match(page,/aria-label="Escolher uma das últimas fatias"/);
 assert.doesNotMatch(helper,/supabase|print_jobs|payment_status/);
});
