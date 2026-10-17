import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const page = read("app/page.tsx");
const catalog = read("app/catalog.ts");
const css = read("app/storefront-vitrine-editorial-experiment.css");
const quoteSource = read("supabase/functions/_shared/commerce-catalog.mjs");
const section = page.slice(page.indexOf('<section className="limited-cup-story"'), page.indexOf('{activeCategory === "fatias" && ('));

test("pacote com zíper sem gramagem incerta na vitrine, carrinho ou pedido estruturado", () => {
  assert.ok(section.includes('<span>Pacote com zíper</span><strong>R$ 15,90 por pacote</strong>'));
  assert.doesNotMatch(section, /190\s*g|190 gramas/);
  assert.equal((catalog.match(/label: "Pacote", whatsappLabel: "Pacote"/g) ?? []).length, 2);
  assert.ok(quoteSource.includes('size_label: "Pacote"'));
  assert.doesNotMatch(quoteSource, /190\s*g/);
  for (const product_id of ["crocante-ninho", "crocante-chocolate"]) {
    const [item] = quoteCartItems([{ product_id, variant_id: "400ml", option_ids: [], quantity: 1 }]).items;
    assert.equal(item.size_label, "Pacote");
    assert.equal(item.unit_price_cents, 1590);
    assert.equal(item.line_total_cents, 1590);
  }
});

test("02 Quantos pacotes aparece só para a edição disponível para compra", () => {
  assert.ok(section.includes('cupSalesEnabled && cupPhase === "available" && ('));
  assert.ok(section.includes('<div className="limited-cup-buy" id="crocantes-quantidade"'));
  assert.ok(section.includes("02 · QUANTOS PACOTES?"));
  assert.ok(section.includes('cupSalesEnabled && cupPhase !== "available" && ('));
  assert.ok(section.includes('className="limited-cup-flavor-summary" id="crocantes-quantidade"'));
  assert.ok(section.includes('Caramelizadas com leite em pó.'));
  assert.ok(section.includes('Caramelizadas com crosta de chocolate.'));
  assert.ok(css.includes('.limited-cup-flavor-summary:empty { display: none; }'));
  assert.ok(page.includes('requestScroll("crocantes-quantidade")'));
  assert.ok(section.includes('aria-controls="crocantes-quantidade"'));
});

test("loja fechada não insinua venda nem repete o bloqueio em formulário", () => {
  assert.ok(page.includes("As vendas estão pausadas. Você ainda pode conhecer os sabores."));
  assert.ok(section.includes('cupPhase === "closed" ? "LOJA FECHADA"'));
  assert.ok(page.includes('(!showLimitedCupView || (cupBuilderFlowActive && availability.ordersOpen))'));
  assert.ok(page.includes('const cupCanOrder = cupSalesEnabled && pipocasAvailable && availability.ordersOpen && availability.source === "supabase"'));
});

test("compra aberta mantém validações e segue até checkout e WhatsApp", () => {
  assert.ok(page.includes('setCart((current) => [...current'));
  assert.ok(page.includes('requestScroll("recebimento")'));
  assert.ok(page.includes('createWhatsAppOrder({'));
  assert.ok(page.includes('tintimWhatsAppUrl(buildRegisteredOrderMessage'));
  assert.ok(page.includes('statusFor(availability, key)'));
});
