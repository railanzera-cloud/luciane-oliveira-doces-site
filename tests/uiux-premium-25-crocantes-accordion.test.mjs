import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const story = page.slice(page.indexOf('<section className="limited-cup-story"'),page.indexOf('{activeCategory === "fatias" && ('));
const styles = css.split("UI/UX PREMIUM 2.5 — detalhes expansíveis")[1];

test("segundo toque fecha; outro sabor substitui detalhes sem acumular", () => {
  assert.ok(page.includes('function toggleCupFlavorPreview(flavor: "ninho" | "chocolate")'));
  assert.ok(page.includes('setCupFlavorPreview((current) => current === flavor ? null : flavor)'));
  assert.equal((story.match(/onClick=\{\(\) => toggleCupFlavorPreview\("/g)||[]).length, 2);
  assert.ok(story.includes('onClick={() => toggleCupFlavorPreview("ninho")}'));
  assert.ok(story.includes('onClick={() => toggleCupFlavorPreview("chocolate")}'));
  assert.ok(story.includes('{cupFlavorPreview ? ('));
  assert.ok(story.includes('className="limited-cup-flavor-hint"'));
});

test("abrir e fechar sao estados acessiveis e identificaveis", () => {
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "chocolate"}'));
  assert.equal((story.match(/aria-controls="limited-cup-flavor-panel"/g)||[]).length, 2);
  assert.ok(story.includes('id="limited-cup-flavor-panel"'));
  assert.ok(story.includes('cupFlavorPreview === "ninho" ? "Fechar detalhes" : "Ver detalhes"'));
  assert.ok(story.includes('cupFlavorPreview === "chocolate" ? "Fechar detalhes" : "Ver detalhes"'));
  assert.ok(story.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert.ok(styles.includes('transform: rotate(-90deg)'));
});

test("detalhes tem altura equilibrada e segue fluxo da pagina", () => {
  assert.ok(story.includes('Caramelizadas com leite em pó.'));
  assert.ok(story.includes('Caramelizadas com crosta de chocolate.'));
  assert.ok(styles.includes('min-height: 52px'));
  assert.ok(styles.includes('min-height: 49px'));
  assert.ok(styles.includes('grid-template-columns: 74px minmax(0, 1fr)'));
  assert.ok(styles.includes('max-width: 359px'));
  assert.ok(styles.includes('env(safe-area-inset-bottom, 0px)'));
  assert.ok(styles.includes('prefers-reduced-motion: reduce'));
  assert.ok(!styles.includes('position: fixed'));
  assert.ok(!styles.includes('position: absolute'));
});

test("nao altera preco, fotos, lancamento nem checkout dos copos", () => {
  assert.ok(story.includes('<strong>R$ 15,90</strong>'));
  assert.ok(story.includes('400 ml'));
  assert.ok(story.includes('190 g'));
  assert.ok(story.includes('/images/edicao-crocante-ninho.webp'));
  assert.ok(story.includes('/images/edicao-crocante-chocolate.webp'));
  assert.ok(story.includes('onClick={() => selectCategory("pipocas")}'));
  assert.ok(release.includes('launchDayStart: "2026-10-15T00:00:00-03:00"'));
  for(const flag of ['orderingIntegrated: false','salesApprovedByStore: false','inventoryVerifiedAvailable: false']) assert.ok(release.includes(flag));
  assert.ok(!styles.includes('.mobile-sticky-bar'));
  assert.ok(!styles.includes('.admin-'));
});
