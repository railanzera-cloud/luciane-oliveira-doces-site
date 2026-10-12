import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../app/attribution-history.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { captureMarketingInteractions, mergeMarketingInteractions } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const t0 = "2026-10-12T13:00:00.000Z";
const ad1 = "https://lucianeoliveiradoces.pages.dev/?utm_source=ig&utm_campaign=Morango&tintim_fbid=120123456789_ig_Instagram_Stories";
const ad2 = "https://lucianeoliveiradoces.pages.dev/?utm_source=ig&utm_campaign=Pipoca&tintim_fbid=120987654321_ig_Instagram_Reels";
test("captura apenas parametros observados na URL", () => {
  const entries = captureMarketingInteractions([], ad1, t0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].ad_id, "120123456789");
  assert.equal(entries[0].utm_campaign, "Morango");
  assert.equal(entries[0].observed_at, t0);
});
test("evita entradas repetidas na mesma chegada", () => {
  const first = captureMarketingInteractions([], ad1, t0);
  assert.equal(captureMarketingInteractions(first, ad1, "2026-10-12T13:02:00Z").length, 1);
});
test("preserva criativos diferentes sem sobrescrever", () => {
  const first = captureMarketingInteractions([], ad1, t0);
  const other = captureMarketingInteractions(first, ad2, "2026-10-12T14:00:00Z");
  assert.deepEqual(other.map(x => x.utm_campaign), ["Morango", "Pipoca"]);
});
test("retorno posterior pelo link da bio nao vira clique inventado", () => {
  const before = captureMarketingInteractions([], ad1, t0);
  const after = captureMarketingInteractions(before, "https://lucianeoliveiradoces.pages.dev/?utm_source=ig&utm_content=link_in_bio", "2026-10-13T11:00:00Z");
  assert.equal(after.length, 2);
  assert.equal(after[1].ad_id, undefined);
  assert.equal(after[1].has_fbclid, false);
  assert.equal(after[0].utm_campaign, "Morango");
});
test("sem parametros novos preserva historico", () => {
  const before = captureMarketingInteractions([], ad1, t0);
  assert.deepEqual(captureMarketingInteractions(before,"https://lucianeoliveiradoces.pages.dev/", "2026-10-13T11:00:00Z"), before);
});
test("mesmo criativo em outro dia representa nova entrada identificada", () => {
  const before = captureMarketingInteractions([], ad1, t0);
  const after = captureMarketingInteractions(before, ad1, "2026-10-13T13:00:00Z");
  assert.equal(after.length, 2);
});
test("nao captura query secreta, token de pedido ou campos arbitrarios", () => {
  const result = captureMarketingInteractions([], ad1 + "&token=segredo&customer_email=a%40b.com", t0);
  assert.ok(!JSON.stringify(result).includes("segredo"));
  assert.ok(!JSON.stringify(result).includes("a@b.com"));
});
test("limita historico para nao crescer indefinidamente", () => {
  let history = [];
  for(let i=0;i<30;i++){
    const hour = String(i%24).padStart(2,"0");
    const day = i < 24 ? "12" : "13";
    history=captureMarketingInteractions(history,"https://site.test/?utm_campaign="+i,`2026-10-${day}T${hour}:00:00Z`);
  }
  assert.equal(history.length, 20);
});

test("une rascunho e armazenamento sem perder campanhas com mesmo tamanho", () => {
 const a = captureMarketingInteractions([], ad1, "2026-10-12T12:00:00Z");
 const b = captureMarketingInteractions([], ad2, "2026-10-12T13:00:00Z");
 const combined = mergeMarketingInteractions(a, b, "2026-10-12T13:05:00Z");
 assert.deepEqual(combined.map(item => item.utm_campaign), ["Morango", "Pipoca"]);
});
test("repetições idênticas dos dois armazenamentos não criam toques falsos", () => {
 const a = captureMarketingInteractions([], ad1, "2026-10-12T12:00:00Z");
 const merged = mergeMarketingInteractions(a, [...a], "2026-10-12T13:00:00Z");
 assert.equal(merged.length, 1);
});
test("eventos fora de ordem são unidos pelo horário observado", () => {
 const a = captureMarketingInteractions([], ad2, "2026-10-12T15:00:00Z");
 const b = captureMarketingInteractions([], ad1, "2026-10-12T10:00:00Z");
 assert.deepEqual(mergeMarketingInteractions(a, b, "2026-10-12T15:01:00Z").map(x => x.utm_campaign), ["Morango", "Pipoca"]);
});
test("expira históricos locais muito antigos sem presumir atribuição de longo prazo", () => {
 const old = captureMarketingInteractions([], ad1, "2026-05-10T12:00:00Z");
 assert.equal(mergeMarketingInteractions(old, [], "2026-10-12T13:00:00Z").length, 0);
 const recent = captureMarketingInteractions([], ad2, "2026-10-11T12:00:00Z");
 assert.equal(mergeMarketingInteractions(old, recent, "2026-10-12T13:00:00Z").length, 1);
});
test("mantém identificadores declarados de campanha e conjunto sem URL privada", () => {
 const url = "https://site.test/?utm_source=ig&utm_id=camp123&campaign_id=123&adset_id=456&ad_id=789&token=secreto";
 const r = captureMarketingInteractions([], url, "2026-10-12T13:00:00Z");
 assert.equal(r[0].utm_id,"camp123");
 assert.equal(r[0].campaign_id,"123");
 assert.equal(r[0].adset_id,"456");
 assert.equal(r[0].ad_id,"789");
 assert.ok(!JSON.stringify(r).includes("secreto"));
});
test("fbclid sozinho não fabrica nome de campanha", () => {
 const r = captureMarketingInteractions([], "https://site.test/?utm_source=ig&utm_content=link_in_bio&fbclid=abc", "2026-10-12T13:00:00Z");
 assert.equal(r[0].utm_campaign, undefined);
 assert.equal(r[0].has_fbclid,true);
});
test("não preserva observações com horário no futuro além da tolerância", () => {
 const future = captureMarketingInteractions([], ad1, "2026-10-13T12:00:00Z");
 assert.equal(mergeMarketingInteractions(future, [], "2026-10-12T13:00:00Z").length, 0);
});
