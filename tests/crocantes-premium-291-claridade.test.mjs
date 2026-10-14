import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = source("app/page.tsx");
const css = source("app/storefront-vitrine-editorial-experiment.css");

function findSelectionHandler() {
  const ast = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = null;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "selectCupFlavor") found = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(found, "A seleção dos Crocantes deve existir");
  return ts.transpileModule(found.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}

test("tocar no sabor já escolhido não o desmarca nem reinicia a etapa", () => {
  const actions = [];
  const handle = new Function("cupFlavorPreview", "setCupFlavorPreview", "setCupAddedNotice", "requestScroll",
    findSelectionHandler() + "\nreturn selectCupFlavor;")(
      "ninho", (value) => actions.push(["sabor", value]),
      (value) => actions.push(["aviso", value]), (value) => actions.push(["scroll", value]));
  handle("ninho");
  assert.deepEqual(actions, []);
  handle("chocolate");
  assert.deepEqual(actions, [["sabor", "chocolate"], ["aviso", ""], ["scroll", "crocantes-quantidade"]]);
});

test("escolha é identificável e a numeração fica exclusivamente nas etapas", () => {
  const section = page.slice(page.indexOf('<section className="limited-cup-story"'),
    page.indexOf('{activeCategory === "fatias" && ('));
  assert.ok(section.includes('aria-pressed={cupFlavorPreview === "ninho"}'));
  assert.ok(section.includes('aria-pressed={cupFlavorPreview === "chocolate"}'));
  assert.equal((section.match(/className="limited-cup-duo-disclosure"/g) || []).length, 2);
  assert.ok(section.includes('? "Selecionado" : "Escolher Ninho"'));
  assert.ok(section.includes('? "Selecionado" : "Escolher Chocolate"'));
  assert.ok(section.includes('<small>NINHO</small>'));
  assert.ok(section.includes('<small>CHOCOLATE</small>'));
  assert.doesNotMatch(section, /<small>0[12] · (?:NINHO|CHOCOLATE)<\/small>/);
  assert.ok(section.includes('01 · ESCOLHA SEU SABOR'));
  assert.ok(section.includes('02 · QUANTOS COPOS?'));
  assert.ok(css.includes('.limited-cup-duo-item.is-selected .limited-cup-duo-disclosure svg {\n  transform: none;'));
});

test("loja fechada comunica consulta, bloqueia quantidade e oculta a barra da edição", () => {
  assert.ok(page.includes('cupPhase === "available" ? "Toque no copo que deseja adicionar." : "Toque em um sabor para conhecer os detalhes."'));
  assert.ok(page.includes('aria-disabled={cupPhase !== "available"}'));
  assert.ok(page.includes('cupSalesEnabled && cupPhase !== "available" && ('));
  assert.ok(page.includes('cupSalesEnabled && cupPhase === "available" && ('));
  assert.ok(page.includes('disabled={cupPhase !== "available" || cupQuantity <= 1 || cupAdding}'));
  assert.ok(page.includes('disabled={cupPhase !== "available" || cupQuantity >= 99 || cupAdding}'));
  assert.ok(page.includes('disabled={cupAdding || cupPhase !== "available" || (Boolean(cupFlavorPreview) && !cupCanOrder)}'));
  assert.ok(page.includes('cupSalesEnabled && cupPhase !== "available" && ('));
  assert.ok(page.includes('cupPhase === "closed" ? "LOJA FECHADA"'));
  assert.ok(page.includes('(!showLimitedCupView || (cupBuilderFlowActive && availability.ordersOpen))'));
  assert.ok(css.includes('.limited-cup-story-availability.is-closed'));
});

test("venda aberta mantém CTA, carrinho, checkout e regra do servidor intactos", () => {
  assert.ok(page.includes('const cupCanOrder = cupSalesEnabled && pipocasAvailable && availability.ordersOpen && availability.source === "supabase"'));
  assert.ok(page.includes('cupCanOrder ? `Adicionar ${cupQuantity}'));
  assert.ok(page.includes('setCart((current) => [...current'));
  assert.ok(page.includes('requestScroll("recebimento")'));
  assert.ok(page.includes('createWhatsAppOrder({'));
  assert.ok(page.includes('tintimWhatsAppUrl(buildRegisteredOrderMessage'));
});
