import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SLICES } from "../supabase/functions/_shared/commerce-catalog.mjs";

const source = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const backend = await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs", import.meta.url), "utf8");

test("fatia Ninho com Morango mantém SKU, nome e preço comercial de R$22", () => {
  const item = SLICES["fatia-ninho-morango"];
  assert.ok(item);
  assert.equal(item.id, "fatia-ninho-morango");
  assert.equal(item.itemKey, "slice_ninho_morango");
  assert.equal(item.name, "Ninho com Morango");
  assert.equal(item.priceCents, 2200);
  assert.match(backend, /"fatia-ninho-morango".*name: "Ninho com Morango", priceCents: 2200/);

  const start = source.indexOf('id: "fatia-ninho-morango",');
  const end = source.indexOf("\n  },", start);
  assert.ok(start >= 0 && end > start);
  const card = source.slice(start, end);
  assert.match(card, /name: "Ninho com Morango"/);
  assert.match(card, /image: "\/fatia-ninho-morango.jpeg"/);
  assert.match(card, /cardImage: "\/fatia-ninho-morango-card.webp"/);
  assert.match(card, /price: 22/);
  assert.match(card, /available: true/);
  assert.doesNotMatch(card, /Brigadeiro Branco com Morango/);
});
