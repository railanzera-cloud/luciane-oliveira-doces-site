import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { orderCheckoutComplements } from "../lib/checkout-complement-order.mjs";
import { CONES } from "../app/catalog.ts";
const page=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/refinamento-cones-visual-20261108.css","utf8");
const layout=readFileSync("app/layout.tsx","utf8");

test("Vitrine usa foto de três sabores, Prestígio usa nova imagem",()=>{
  assert.ok(page.includes('photo="/images/cones-trufados-trio-20261108.webp"'));
  assert.ok(page.includes('id === "cones" ? "/images/cones-trufados-trio-card-20261108.webp"'));
  const prestigio=CONES.find(p=>p.id==="cone-trufado-prestigio");
  assert.equal(prestigio?.image,"/images/cone-trufado-prestigio-20261108-v2.webp");
  assert.equal(prestigio?.cardImage,"/images/cone-trufado-prestigio-card-20261108-v2.webp");
  assert.equal(prestigio?.variants[0].price,14);
  assert.equal(CONES.find(p=>p.id==="cone-trufado-dois-amores")?.variants[0].price,14);
  assert.equal(CONES.find(p=>p.id==="cone-trufado-ferrero-rocher")?.variants[0].price,16);
});

test("Tela de Cones anima entrada com duração e redução de movimento",()=>{
  assert.ok(page.includes('data-active-category={activeCategory ?? undefined} id="configurador"'));
  assert.ok(page.includes('data-active-category={activeCategory ?? undefined} id="inicio"'));
  assert.ok(css.includes('@keyframes cones-enter-softly'));
  assert.ok(css.includes('.menu-entry[data-active-category="cones"] .entry-heading'));
  assert.ok(css.includes('#configurador[data-active-category="cones"] .cone-builder'));
  assert.ok(css.includes('390ms cubic-bezier'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(layout.includes('import "./refinamento-cones-visual-20261108.css";'));
});

test("Prévia da fatia usa imagem do cartão, sem exibir print integral, e mantém nome/valor",()=>{
  assert.ok(page.includes('<img src={selectedSlice.cardImage ?? selectedSlice.image} alt="" width="72" height="72"'));
  assert.ok(!page.includes('<img src={selectedSlice.image} alt="" width="140" height="140"'));
  assert.ok(css.includes('grid-template-areas: "image information" "image price"'));
  assert.ok(css.includes('object-fit: cover'));
  assert.ok(css.includes('grid-area: image'));
  assert.ok(css.includes('grid-area: price'));
  assert.ok(css.includes('height: 150px'));
  assert.ok(css.includes('background: #f2ece4'));
});

test("Botões entre categorias ganham contraste sem virar promoção",()=>{
  assert.ok(css.includes('.category-shortcuts .category-shortcut'));
  assert.ok(css.includes('linear-gradient(150deg, rgba(111,67,43,.68)'));
  assert.ok(css.includes('border-color: rgba(231,174,108,.66)'));
  assert.ok(css.includes(':focus'));
  assert.ok(!css.includes('animation: infinite'));
});

test("Cones aparecem em todas origens se disponíveis e somem se não estão",()=>{
  for(const origin of ["gourmet","fatias","trufadas","cones"]){
    const yes=orderCheckoutComplements(origin,{cones:true,gourmet:true,fatias:true,trufadas:true,bebidas:false});
    assert.equal(yes[0],"cones");
    assert.equal(new Set(yes).size,yes.length);
    assert.ok(!orderCheckoutComplements(origin,{cones:false,gourmet:true,fatias:true,trufadas:true}).includes("cones"));
  }
  assert.ok(page.includes("cones: conesCanBeAdded"));
  assert.ok(page.includes("conesCanBeAdded = conesAvailable && availability.ordersOpen"));
  assert.ok(page.includes('if (id === "cones") startAnother("cones")'));
});
