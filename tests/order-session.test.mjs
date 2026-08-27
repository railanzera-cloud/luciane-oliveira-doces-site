import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("keeps an unfinished order only in the current browser tab", () => {
  assert.match(pageSource, /window\.sessionStorage\.getItem\(ORDER_STORAGE_KEY\)/);
  assert.match(pageSource, /window\.sessionStorage\.setItem\(ORDER_STORAGE_KEY/);
  assert.doesNotMatch(pageSource, /ORDER_STORAGE_TTL/);
  assert.doesNotMatch(pageSource, /salvo neste aparelho por até 2 horas/i);
});

test("makes restored orders explicit and clearable", () => {
  assert.match(pageSource, /Pedido em andamento/);
  assert.match(pageSource, />Ver pedido</);
  assert.match(pageSource, />Limpar</);
  assert.match(pageSource, /function clearOrder\(\)/);
});

test("keeps the legacy cleanup without restoring from local storage", () => {
  assert.match(pageSource, /window\.localStorage\.removeItem\(LEGACY_ORDER_STORAGE_KEY\)/);
  assert.doesNotMatch(pageSource, /window\.localStorage\.(getItem|setItem)\(ORDER_STORAGE_KEY/);
});
