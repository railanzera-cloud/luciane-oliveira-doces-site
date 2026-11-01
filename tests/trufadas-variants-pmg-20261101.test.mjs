import assert from "node:assert/strict";
import test from "node:test";
import {
  TRUFADAS_ACTIVE_ITEM_KEYS,
  TRUFADAS_LEGACY,
  TRUFADAS_SIZES,
  TRUFADAS_VARIANTS,
  getTrufadaVariant,
} from "../supabase/functions/_shared/trufadas-variants.mjs";

test("Trufadas PMG: matriz confirmada de nove combinacoes e precos em centavos", () => {
  const expected = {
    "crocante-ninho": [1590, 1890, 2090],
    "trufada-pacoca": [1490, 1690, 1890],
    "trufada-coco-queimado": [1490, 1690, 1890],
  };
  assert.deepEqual(TRUFADAS_SIZES, ["p", "m", "g"]);
  for (const [id, prices] of Object.entries(expected)) {
    assert.equal(TRUFADAS_VARIANTS[id].productId, id);
    assert.deepEqual(TRUFADAS_SIZES.map(size => getTrufadaVariant(id, size).priceCents), prices);
  }
});

test("Trufadas PMG: cada combinacao tem chave de estoque unica e nao legada", () => {
  assert.equal(TRUFADAS_ACTIVE_ITEM_KEYS.length, 9);
  assert.equal(new Set(TRUFADAS_ACTIVE_ITEM_KEYS).size, 9);
  const historicalKeys = Object.values(TRUFADAS_LEGACY).map(item => item.itemKey);
  assert.equal(TRUFADAS_ACTIVE_ITEM_KEYS.some(key => historicalKeys.includes(key)), false);
  assert.equal(TRUFADAS_LEGACY["crocante-ninho"].variantId, "400ml");
  assert.equal(TRUFADAS_LEGACY["crocante-chocolate"].retiredFromNewSales, true);
});

test("Trufadas PMG: rejeita legado e variantes inválidas na cotação nova", () => {
  assert.equal(getTrufadaVariant("trufada-pacoca", "400ml"), null);
  assert.equal(getTrufadaVariant("crocante-chocolate", "p"), null);
  assert.equal(getTrufadaVariant("__proto__", "p"), null);
  assert.equal(getTrufadaVariant("crocante-ninho", "inexistente"), null);
});
