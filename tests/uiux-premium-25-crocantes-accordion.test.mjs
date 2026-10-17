import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const story = page.slice(page.indexOf('<section className="limited-cup-story"'),page.indexOf('{activeCategory === "fatias" && ('));
const styles = css.split("UI/UX PREMIUM 2.5 — detalhes expansíveis")[1]?.split("Premium 2.6 — compra de copos")[0];

test("o sabor escolhido permanece; outro sabor substitui a seleção", () => {
  assert.ok(page.includes('function selectCupFlavor(flavor: "ninho" | "chocolate")'));
  assert.ok(page.includes('if (cupFlavorPreview === flavor) return;'));
  assert.ok(page.includes('setCupFlavorPreview(flavor)'));
  assert.equal((story.match(/onClick=\{\(\) => selectCupFlavor\("/g)||[]).length, 2);
  assert.ok(story.includes('onClick={() => selectCupFlavor("ninho")}'));
  assert.ok(story.includes('onClick={() => selectCupFlavor("chocolate")}'));
  assert.ok(story.includes('{cupFlavorPreview ? ('));
  assert.ok(story.includes('className="limited-cup-flavor-hint"'));
});

test("abrir e fechar sao estados acessiveis e identificaveis", () => {
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "chocolate"}'));
  assert.equal((story.match(/aria-controls="crocantes-quantidade"/g)||[]).length, 2);
  assert.ok(story.includes('id="limited-cup-flavor-panel"'));
  assert.ok(story.includes('cupFlavorPreview === "ninho" ? "Selecionado" : "Escolher Ninho"'));
  assert.ok(story.includes('cupFlavorPreview === "chocolate" ? "Selecionado" : "Escolher Chocolate"'));
  assert.ok(story.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert.ok(css.includes('transform: none;'));
  assert.ok(css.includes('.limited-cup-duo-item[aria-pressed="true"]'));
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

test("preço, fotos e checkout dos copos mantidos, sem data automática", () => {
  assert.ok(story.includes('R$ 15,90 por pacote'));
  assert.ok(story.includes('Pacote com zíper'));
  assert.ok(!story.includes('190 g'));
  assert.ok(story.includes('/images/pipocas-trufadas-ninho.avif'));
  assert.ok(story.includes('/images/pipocas-trufadas-chocolate.avif'));
  assert.ok(story.includes('onClick={() => selectCategory("pipocas")}'));
  assert.ok(release.includes('if (!ordersOpen) return "closed"'));
  assert.doesNotMatch(release,/launchDayStart/);
  assert.ok(!styles.includes('.mobile-sticky-bar'));
  assert.ok(!styles.includes('.admin-'));
});
