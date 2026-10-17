import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const start = page.indexOf('<section className="limited-cup-story"');
const end = page.indexOf('{activeCategory === "fatias" && (',start);
const story = page.slice(start,end);
const focused = css.split("UI/UX PREMIUM 2.4 — clareza")[1]?.split("UI/UX PREMIUM 2.5 — detalhes expansíveis")[0];

test("vitrine distingue dois copos para escolher, sem sugerir mistura no mesmo copo", () => {
  assert.ok(page.includes('Escolha entre 2 sabores'));
  assert.ok(page.includes('Nossas pipocas caramelizadas e trufadas ganharam uma nova apresentação: pacotes com zíper, nos sabores Ninho e Chocolate.'));
  assert.ok(page.includes('className="limited-cup-teaser-price"'));
  assert.ok(story.includes('PIPOCAS TRUFADAS</span>'));
  assert.ok(page.includes("R$ 15,90"));
  assert.ok(focused.includes(".limited-cup-teaser-price"));
});

test("detalhe escolhido substitui instrução, com altura em fluxo natural", () => {
  assert.ok(story.includes('id="limited-cup-flavor-panel" className="limited-cup-flavor-slot"'));
  assert.ok(story.includes('{cupFlavorPreview ? ('));
  assert.ok(story.includes(') : ('));
  assert.ok(story.includes('Escolha um dos sabores para conhecer os detalhes.'));
  assert.ok(!story.includes('Selecione o outro copo para comparar os sabores.'));
  assert.ok(story.includes('cupFlavorPreview === "ninho" ? "Selecionado" : "Escolher Ninho"'));
  assert.ok(story.includes('cupFlavorPreview === "chocolate" ? "Selecionado" : "Escolher Chocolate"'));
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "chocolate"}'));
  assert.ok(story.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert.ok(focused.includes("grid-template-columns: auto minmax(0, 1fr)"));
  assert.ok(!focused.includes("position: absolute"));
  assert.ok(!focused.includes("position: fixed"));
});

test("mensagens da edição limitada acompanham a loja, não a data", () => {
  assert.ok(story.includes('LOJA FECHADA'));
  assert.ok(page.includes('As vendas estão pausadas. Você ainda pode conhecer os sabores.'));
  assert.ok(page.includes('Os dois sabores estão esgotados no momento.'));
  assert.ok(story.includes('<p>{cupLaunchCopy.description}</p>'));
  assert.doesNotMatch(page,/ESTREIA · QUINTA, 15\/10/);
  assert.ok(release.includes('if (!ordersOpen) return "closed"'));
  assert.ok(release.includes('if (anyCupAvailable) return "available"'));
});

test("atalho para potes e fotos mantêm fluxo e recursos aprovados", () => {
  assert.ok(story.includes('onClick={() => selectCategory("pipocas")}'));
  assert.ok(story.includes('Escolher tamanho <ChevronRight'));
  assert.ok(story.includes("/images/pipocas-trufadas-ninho.avif"));
  assert.ok(story.includes("/images/pipocas-trufadas-chocolate.avif"));
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(focused.includes(".limited-cup-story-footer"));
  assert.ok(focused.includes("prefers-reduced-motion: reduce"));
  assert.ok(!focused.includes(".mobile-sticky-bar"));
  assert.ok(!focused.includes(".admin-"));
});
