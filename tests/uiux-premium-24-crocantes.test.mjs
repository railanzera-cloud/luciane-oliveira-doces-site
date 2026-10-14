import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const start = page.indexOf('<section className="limited-cup-story"');
const end = page.indexOf('{activeCategory === "fatias" && (',start);
const story = page.slice(start,end);
const focused = css.split("UI/UX PREMIUM 2.4 — clareza")[1];

test("vitrine distingue dois copos para escolher, sem sugerir mistura no mesmo copo", () => {
  assert.ok(page.includes('Escolha entre 2 sabores'));
  assert.ok(page.includes('Pipocas crocantes caramelizadas, em dois sabores para escolher: Ninho ou Chocolate.'));
  assert.ok(page.includes('className="limited-cup-teaser-price"'));
  assert.ok(story.includes('EDIÇÃO LIMITADA</span>'));
  assert.ok(page.includes("R$ 15,90"));
  assert.ok(focused.includes(".limited-cup-teaser-price"));
});

test("detalhe escolhido substitui instrução, com altura em fluxo natural", () => {
  assert.ok(story.includes('id="limited-cup-flavor-panel" className="limited-cup-flavor-slot"'));
  assert.ok(story.includes('{cupFlavorPreview ? ('));
  assert.ok(story.includes(') : ('));
  assert.ok(story.includes('Toque em um copo para ver os detalhes do sabor.'));
  assert.ok(!story.includes('Selecione o outro copo para comparar os sabores.'));
  assert.ok(story.includes('cupFlavorPreview === "ninho" ? "Fechar detalhes" : "Ver detalhes"'));
  assert.ok(story.includes('cupFlavorPreview === "chocolate" ? "Fechar detalhes" : "Ver detalhes"'));
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "chocolate"}'));
  assert.ok(story.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert.ok(focused.includes("grid-template-columns: auto minmax(0, 1fr)"));
  assert.ok(!focused.includes("position: absolute"));
  assert.ok(!focused.includes("position: fixed"));
});

test("estreia e reposição ficam em um aviso, com estados comerciais corretos", () => {
  assert.ok(story.includes('ESTREIA · QUINTA, 15/10, ÀS 12H'));
  assert.ok(page.includes('Edição limitada, enquanto durarem os copos. Sem reposição.'));
  assert.ok(page.includes('Aguardando confirmação da loja. Sem reposição após o fim do estoque.'));
  assert.ok(story.includes('<p>{cupLaunchCopy.description}</p>'));
  assert.ok(!story.includes('<span>Esta edição em copo não terá reposição após o fim do estoque.</span>'));
  assert.ok(release.includes('launchDayStart: "2026-10-15T12:00:00-03:00"'));
  assert.ok(release.includes("orderingIntegrated: true"));
  assert.ok(release.includes("salesApprovedByStore: true"));
  assert.ok(release.includes("inventoryVerifiedAvailable: true"));
  assert.ok(release.includes("cfg.orderingIntegrated && cfg.salesApprovedByStore && cfg.inventoryVerifiedAvailable"));
});

test("atalho para potes e fotos mantêm fluxo e recursos aprovados", () => {
  assert.ok(story.includes('onClick={() => selectCategory("pipocas")}'));
  assert.ok(story.includes('Escolher tamanho <ChevronRight'));
  assert.ok(story.includes("/images/edicao-crocante-ninho.webp"));
  assert.ok(story.includes("/images/edicao-crocante-chocolate.webp"));
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(focused.includes(".limited-cup-story-footer"));
  assert.ok(focused.includes("prefers-reduced-motion: reduce"));
  assert.ok(!focused.includes(".mobile-sticky-bar"));
  assert.ok(!focused.includes(".admin-"));
});
