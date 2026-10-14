import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

const story = page.slice(page.indexOf('<section className="limited-cup-story"'), page.indexOf('{activeCategory === "fatias" && ('));
const look = css.slice(css.indexOf("UI/UX PREMIUM 2.3 — profundidade editorial"));

test("dois sabores continuam como seleção informativa, fotos e preço intactos", () => {
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "ninho"}'));
  assert.ok(story.includes('aria-expanded={cupFlavorPreview === "chocolate"}'));
  assert.ok(story.includes('toggleCupFlavorPreview("ninho")'));
  assert.ok(story.includes('toggleCupFlavorPreview("chocolate")'));
  assert.ok(story.includes("Caramelo com Leite Ninho"));
  assert.ok(story.includes("Caramelo com Chocolate"));
  assert.ok(story.includes("/images/edicao-crocante-ninho.webp"));
  assert.ok(story.includes("/images/edicao-crocante-chocolate.webp"));
  assert.ok(story.includes('<strong>R$ 15,90</strong>'));
  assert.ok(story.includes("400 ml"));
  assert.ok(story.includes("190 g"));
  assert.ok(story.includes('aria-atomic="true"'));
  assert.ok(story.includes('className="limited-cup-flavor-details"'));
  assert.equal((story.match(/className="limited-cup-duo-disclosure"/g)||[]).length, 2);
});

test("estreia 15/10 ganha presença sem liberar automaticamente as vendas", () => {
  assert.ok(page.includes("ESTREIA · QUINTA, 15/10"));
  assert.ok(story.includes('cupPhase === "prelaunch" ? "ESTREIA · QUINTA, 15/10, ÀS 12H"'));
  assert.ok(story.includes('{cupLaunchCopy.description}'));
  assert.ok(look.includes(".limited-cup-story-availability-kicker"));
  assert.ok(release.includes('launchDayStart: "2026-10-15T12:00:00-03:00"'));
  assert.ok(release.includes("orderingIntegrated: true"));
  assert.ok(release.includes("salesApprovedByStore: true"));
  assert.ok(release.includes("inventoryVerifiedAvailable: true"));
  assert.ok(release.includes("cfg.orderingIntegrated && cfg.salesApprovedByStore && cfg.inventoryVerifiedAvailable"));
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
