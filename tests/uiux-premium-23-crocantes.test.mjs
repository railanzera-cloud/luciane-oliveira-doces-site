import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const story = page.slice(page.indexOf('<section className="limited-cup-story"'), page.indexOf('{activeCategory === "fatias" && ('));
const look = css.slice(css.indexOf("UI/UX PREMIUM 2.3 — profundidade editorial"), css.indexOf("UI/UX PREMIUM 2.4 — clareza"));

test("dois sabores continuam como seleção informativa, fotos e preço intactos", () => {
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-pressed={cupFlavorPreview === "chocolate"}'));
  assert.ok(story.includes('selectCupFlavor("ninho")'));
  assert.ok(story.includes('selectCupFlavor("chocolate")'));
  assert.ok(story.includes("Caramelo e Ninho"));
  assert.ok(story.includes("Caramelo e Chocolate"));
  assert.ok(story.includes("/images/pipocas-trufadas-ninho.avif"));
  assert.ok(story.includes("/images/pipocas-trufadas-chocolate.avif"));
  assert.ok(story.includes('<strong>R$ 15,90</strong>'));
  assert.ok(story.includes("Pacote com zíper"));
  assert.ok(!story.includes("190 g"));
  assert.ok(story.includes('aria-atomic="true"'));
  assert.ok(story.includes('className="limited-cup-flavor-details"'));
  assert.equal((story.match(/className="limited-cup-duo-disclosure"/g)||[]).length, 2);
});

test("loja e estoque substituem a estreia como estado comercial", () => {
  assert.doesNotMatch(page,/ESTREIA · QUINTA, 15\/10/);
  assert.ok(story.includes('cupPhase === "closed" ? "LOJA FECHADA"'));
  assert.ok(story.includes('{cupLaunchCopy.description}'));
  assert.ok(look.includes(".limited-cup-story-availability-kicker"));
  assert.ok(release.includes('if (!ordersOpen) return "closed"'));
  assert.ok(release.includes('if (anyCupAvailable) return "available"'));
  assert.doesNotMatch(release,/launchDayStart|2026-10-15/);
});

test("atalho abre montagem dos potes sem competir com a edição em copos", () => {
  assert.ok(story.includes('onClick={() => selectCategory("pipocas")}'));
  assert.ok(story.includes('<span>Prefere os potes recheados?</span>'));
  assert.ok(story.includes('Escolher tamanho <ChevronRight'));
  assert.ok(look.includes(".limited-cup-story-footer > button"));
  assert.ok(look.includes(".limited-cup-story-measure"));
  assert.ok(look.includes(".limited-cup-duo-item.is-selected"));
  assert.ok(look.includes("prefers-reduced-motion: reduce"));
  assert.ok(!look.includes(".admin-"));
  assert.ok(!look.includes(".mobile-sticky-bar"));
  assert.ok(!look.includes(".category-option"));
});
