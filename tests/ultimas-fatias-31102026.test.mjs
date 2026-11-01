import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const helper=readFileSync("app/last-slices-campaign.ts","utf8");
const page=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/globals.css","utf8");
const navigation=readFileSync("app/menu-navigation.ts","utf8");
const compiled=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const helperModule=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));

test("campanha somente 31/10 ate 20h no fuso America/Belem",()=>{
 const {isLastSlicesWindow}=helperModule;
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T20:54:00Z")),true);
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T22:59:59Z")),true);
 assert.equal(isLastSlicesWindow(new Date("2026-10-31T23:00:00Z")),false);
 assert.equal(isLastSlicesWindow(new Date("2026-11-01T10:00:00Z")),false);
 assert.equal(isLastSlicesWindow(new Date("not-a-date")),false);
});
test("somente morango e Prestigio, sem simular estoque ou demanda",()=>{
 assert.deepEqual([...helperModule.LAST_SLICES_PRODUCT_IDS],["fatia-chocolate-morango","fatia-prestigio"]);
 assert.match(page,/LAST_SLICES_PRODUCT_IDS\.some/);
 assert.match(page,/activeCategory === "fatias"/);
 assert.match(page,/availability\.source === "supabase"/);
 assert.match(page,/availability\.ordersOpen/);
 assert.match(page,/!strawberryPreorder/);
 assert.match(page,/sliceIsAvailable\(slice\.id\)/);
 assert.doesNotMatch(page,/5 unidades restantes|cinco unidades restantes|centenas de pedidos|mais vendidos de hoje/i);
});
test("faixa curta objetiva, sem CTA, preco ou outros elementos duplicados",()=>{
 assert.match(page,/ÚLTIMAS FATIAS DE HOJE/);
 assert.match(page,/Ainda dá tempo de garantir a sua\./);
 assert.match(page,/Até 20h · enquanto houver/);
 assert.match(page,/Escolha a fatia na foto abaixo/);
 const banner=page.split('className="last-slices-banner"')[1]?.split('</aside>')[0]??"";
 assert.ok(banner.length>160);
 assert.doesNotMatch(banner,/<button|last-slices-actions|last-slices-action|currency\.format|sem desconto/i);
 assert.match(css,/\.storefront \.last-slices-banner/);
 assert.match(css,/border-left: 3px solid/);
 assert.doesNotMatch(css,/\.storefront \.last-slices-actions/);
});
test("fotografias aparecem logo apos o aviso e carregam prioritariamente",()=>{
 const bannerEnd=page.indexOf('</aside>}',page.indexOf('className="last-slices-banner"'));
 const galleryStart=page.indexOf('<RadioGroup className="slice-grid"',bannerEnd);
 assert.ok(bannerEnd>0 && galleryStart>bannerEnd && galleryStart-bannerEnd<1800);
 assert.match(page,/loading=\{lastSlicesIds\.has\(slice\.id\) && available \? "eager" : "lazy"\}/);
 assert.match(page,/fetchPriority=\{lastSlicesIds\.has\(slice\.id\) && available \? "high" : "low"\}/);
 assert.match(page,/is-last-slices/);
 assert.match(page,/last-slices-card-tag/);
 assert.match(css,/\.slice-media > \.last-slices-card-tag/);
 assert.match(css,/position: absolute/);
});
test("tocou foto, escolhe calda e visualiza escolha; sem mudar checkout",()=>{
 assert.match(page,/<RadioGroup className="slice-grid" value=\{sliceProductId\}/);
 assert.match(page,/setSliceProductId\(value\)/);
 assert.match(page,/requestScroll\("calda-fatias"\)/);
 assert.match(page,/className="boutique-slice-preview"/);
 assert.match(page,/Selecione um sabor por vez/);
 assert.match(css,/@media \(max-width: 580px\)/);
 assert.match(page,/aria-label="Últimas fatias disponíveis hoje"/);
});
test("anuncios podem apontar diretamente para fatias sem afetar quem navega pelo site",()=>{
 assert.match(navigation,/searchParams\.get\("categoria"\)/);
 assert.match(navigation,/category === "pipocas" \|\| category === "fatias"/);
 assert.match(navigation,/categoryUrl/);
 assert.doesNotMatch(helper,/supabase|print_jobs|payment_status/);
});
