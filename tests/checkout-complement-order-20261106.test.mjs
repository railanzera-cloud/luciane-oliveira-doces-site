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

test("Cones: outro sabor aparece primeiro, no mesmo conjunto de recomendações", () => {
  assert.deepEqual(
    orderCheckoutComplements("cones", {cones:true,trufadas:true,fatias:true,gourmet:true,bebidas:false}),
    ["cones", "trufadas", "fatias", "gourmet"],
  );
  assert.deepEqual(
    orderCheckoutComplements("cones", {cones:false,trufadas:true,fatias:true,gourmet:false}),
    ["trufadas", "fatias"],
  );
  assert.deepEqual(orderCheckoutComplements("cones", {}), []);
});

test("Cones disponíveis entram nas recomendações das três jornadas existentes", () => {
  const available = {...all, cones: true};
  assert.deepEqual(orderCheckoutComplements("gourmet", available), ["cones","trufadas","fatias","gourmet"]);
  assert.deepEqual(orderCheckoutComplements("fatias", available), ["cones","gourmet","trufadas","fatias"]);
  assert.deepEqual(orderCheckoutComplements("trufadas", available), ["cones","gourmet","fatias","trufadas"]);
});

// Natal não cria uma quinta etapa obrigatória: ocupa um dos quatro convites,
// substituindo a repetição da categoria de origem quando está realmente disponível.
test("Natal aparece como complemento nas quatro categorias habituais, sem ampliar o bloco", () => {
  const ready = { gourmet:true, trufadas:true, fatias:true, cones:true, natal:true, bebidas:false };
  assert.deepEqual(orderCheckoutComplements("gourmet", ready), ["natal","cones","trufadas","fatias"]);
  assert.deepEqual(orderCheckoutComplements("trufadas", ready), ["natal","cones","gourmet","fatias"]);
  assert.deepEqual(orderCheckoutComplements("fatias", ready), ["natal","cones","gourmet","trufadas"]);
  assert.deepEqual(orderCheckoutComplements("cones", ready), ["natal","trufadas","fatias","gourmet"]);
  assert.deepEqual(orderCheckoutComplements("natal", ready), ["cones","trufadas","fatias","gourmet"]);
  for (const origin of ["gourmet","trufadas","fatias","cones","natal"]) {
    assert.equal(orderCheckoutComplements(origin, ready).length, 4);
  }
});

test("Coleção oculta/esgotada não aparece e a ordem legada permanece intacta", () => {
  const base = { gourmet:true, trufadas:true, fatias:true, cones:true, bebidas:false };
  for (const natal of [false, undefined, "true", "hidden"]) {
    const result = orderCheckoutComplements("fatias", {...base,natal});
    assert.deepEqual(result, ["cones","gourmet","trufadas","fatias"]);
  }
  assert.deepEqual(
    orderCheckoutComplements("cones",{...base,natal:true,cones:true,fatias:false,trufadas:false}),
    ["natal","gourmet"]
  );
});
