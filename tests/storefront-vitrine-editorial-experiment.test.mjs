import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const [page,layout,css] = await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/layout.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/storefront-vitrine-editorial-experiment.css",import.meta.url),"utf8"),
]);
test("vitrine experimental é uma camada posterior e restrita à tela inicial",()=>{
  assert.ok(layout.indexOf('import "./storefront-vitrine-editorial-experiment.css";') > layout.indexOf('import "./storefront-boutique-v3.css";'));
  assert.ok(css.includes(".storefront .menu-entry.is-neutral"));
  assert.ok(!css.includes(".admin-"));
  assert.ok(!css.includes(".checkout-"));
  assert.ok(!css.includes(".builder-"));
});
test("fotografias e legendas são elementos independentes e a ação é explícita",()=>{
  assert.ok(page.includes('className="category-option-media"'));
  assert.ok(page.includes('className="category-option-copy"'));
  assert.ok(page.includes('className="category-option-action"'));
  assert.ok(page.includes('"Escolher pipocas" : "Ver as fatias"'));
  assert.ok(page.includes("onClick={() => selectCategory(category.id)}"));
  assert.ok(page.includes('disabled={!available}'));
  assert.ok(css.includes("grid-template-columns: minmax(0,44%) minmax(0,56%)"));
  assert.ok(css.includes(".category-option-media img"));
});
test("informações e regras operacionais continuam acessíveis",()=>{
  assert.ok(page.includes("{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja."));
  assert.ok(page.includes("Entrega a partir de R$8 ou retirada em Paragominas"));
  assert.ok(page.includes("visibleCategories.map((category)"));
  assert.ok(page.includes("categoryIsAvailable(category.id)"));
  assert.ok(page.includes("cover.cardImage ?? cover.image"));
  assert.ok(page.includes("Esgotado"));
});
test("acessibilidade, mobile estreito e movimento reduzido cobertos",()=>{
  for(const rule of ["max-width:359px","min-width:600px","min-width:980px","prefers-reduced-motion:reduce",":focus-visible"]){
    assert.ok(css.includes(rule),rule);
  }
});

test("mobile mantém as duas vitrines com igual altura e evita crescimento pela proporção das fotos",()=>{
  assert.ok(css.includes("height: 190px;"));
  assert.ok(css.includes("height: 204px;"));
  assert.ok(css.includes("grid-template-rows: minmax(0, 1fr)"));
  assert.ok(css.includes("position: absolute;"));
  assert.ok(css.includes(".category-option-media img"));
});
test("v4 usa chocolate-cobre mais profundo, sem apagar as fotografias",()=>{
  for(const value of ["#bd9675","#b38b6c","#ab8064","color: #23150d","color: #2b1a10"]){
    assert.ok(css.includes(value),value);
  }
  assert.ok(css.includes("category-option-copy::after"));
  assert.ok(css.includes("linear-gradient(90deg, rgba(181,139,108,0),rgba(181,139,108,.94))"));
  assert.ok(css.includes("background: transparent;"));
  assert.ok(css.includes("content: none"));
});
test("contraste da legenda chocolate com o texto claro atinge no mínimo 4.5:1",()=>{
  const rgb = (hex) => [0,2,4].map(i => parseInt(hex.slice(i,i+2),16)/255);
  const luminance = hex => rgb(hex).map(c => c<=0.04045?c/12.92:Math.pow((c+.055)/1.055,2.4))
    .reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const ratio = (x,y) => {
    const a=luminance(x),b=luminance(y);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  for(const bg of ["51362a","442d23","322017"]){
    for(const fg of ["f4e7d7","e7cbb0","e7b87f"]){
      assert.ok(ratio(bg,fg)>=4.5, bg+" x "+fg+": "+ratio(bg,fg).toFixed(2));
    }
  }
});
test("o bloco operacional fica discreto e não perde informações",()=>{
  assert.ok(css.includes("border-left: 2px solid rgba(216,161,100,.78)"));
  assert.ok(css.includes("background: transparent;"));
  assert.ok(page.includes("O prazo começa após a confirmação da loja."));
});

test("v5 remove halo da junção e preserva ações de navegação",()=>{
  const last = css.slice(css.indexOf("Editorial v5"));
  assert.ok(last.includes(".category-option-copy::after"));
  assert.ok(last.includes("content: none;"));
  assert.ok(last.includes("linear-gradient(143deg, #51362a 0%, #442d23 57%, #322017 100%)"));
  assert.ok(last.includes("color: #f4e7d7;"));
  assert.ok(last.includes("color: #e7b87f;"));
  assert.ok(page.includes('className="category-option-action"'));
  assert.ok(page.includes('onClick={() => selectCategory(category.id)}'));
});
test("nova imagem da fatia só afeta a vitrine e tem fallback do catálogo",()=>{
  assert.ok(page.includes('category.id === "fatias" ? "/images/categoria-fatias-editorial.webp"'));
  assert.ok(page.includes('event.currentTarget.src = cover.cardImage ?? cover.image'));
  assert.ok(page.includes('alt=""'));
  assert.ok(page.includes('disabled={!available}'));
});
