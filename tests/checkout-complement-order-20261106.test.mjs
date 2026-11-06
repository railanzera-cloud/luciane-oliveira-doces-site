import test from "node:test";
import assert from "node:assert/strict";
import { orderCheckoutComplements } from "../lib/checkout-complement-order.mjs";

const all = { gourmet: true, trufadas: true, fatias: true, bebidas: false };

test("Gourmet: sugere categoria complementar antes de outro pote", () => {
  assert.deepEqual(orderCheckoutComplements("gourmet", all), ["trufadas", "fatias", "gourmet"]);
});

test("Trufadas: sugere Gourmet e fatias antes de repetir pacote", () => {
  assert.deepEqual(orderCheckoutComplements("trufadas", all), ["gourmet", "fatias", "trufadas"]);
});

test("Fatias: sugere outras categorias antes de outra fatia", () => {
  assert.deepEqual(orderCheckoutComplements("fatias", all), ["gourmet", "trufadas", "fatias"]);
});

test("Categoria esgotada ou sem disponibilidade verificada não recebe CTA de adicionar", () => {
  assert.deepEqual(orderCheckoutComplements("gourmet", { gourmet: true, trufadas: true, fatias: false }), ["trufadas", "gourmet"]);
  assert.deepEqual(orderCheckoutComplements("fatias", { gourmet: true, fatias: undefined, trufadas: false }), ["gourmet"]);
  assert.deepEqual(orderCheckoutComplements("gourmet", {}), []);
});

test("Bebidas não interferem na prioridade e só entram quando habilitadas", () => {
  assert.deepEqual(orderCheckoutComplements("gourmet", { ...all, bebidas: true }), ["trufadas", "fatias", "gourmet", "bebidas"]);
});

test("Nenhuma opção repetida e qualquer estado não booleano falha fechado", () => {
  const choices = orderCheckoutComplements("trufadas", { gourmet: "true", trufadas: true, fatias: 1, bebidas: false });
  assert.deepEqual(choices, ["trufadas"]);
  assert.equal(new Set(choices).size, choices.length);
});
