import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("adds Prestígio at the recovered current price without a promotional badge", () => {
  assert.match(catalog, /id: "fatia-prestigio"[\s\S]*?name: "Prestígio"[\s\S]*?price: 20/);
  assert.doesNotMatch(page, />\s*Novo\s*</i);
});

test("keeps tomorrow's slices visible but unavailable until 30/08", () => {
  assert.match(catalog, /id: "fatia-ninho-morango"[\s\S]*?availabilityLabel: "Disponível em 30\/08"[\s\S]*?available: false/);
  assert.match(catalog, /id: "fatia-prestigio"[\s\S]*?availabilityLabel: "Disponível em 30\/08"[\s\S]*?available: false/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming"/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming" : ""}`\}>\{slice\.availabilityLabel \?\? "Esgotado hoje"\}/);
});

test("uses a neutral photo placeholder without making the item selectable", () => {
  assert.match(page, /<small>Foto em breve<\/small>/);
  assert.match(page, /disabled=\{!slice\.available \|\| !variant\.available\}/);
});
