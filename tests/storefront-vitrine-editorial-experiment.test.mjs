import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const [page,layout,css] = await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/layout.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/storefront-vitrine-editorial-experiment.css",import.meta.url),"utf8"),
]);
// As asserções editoriais históricas param antes da camada de acabamento
// de conversão, que foi explicitamente autorizada depois.
const legacyEditorialCss = css.split("/*\n * ACABAMENTO DE CONVERSÃO —")[0];
test("vitrine experimental é uma camada posterior e restrita à tela inicial",()=>{
  assert.ok(layout.indexOf('import "./storefront-vitrine-editorial-experiment.css";') > layout.indexOf('import "./storefront-boutique-v3.css";'));
  assert.ok(css.includes(".storefront .menu-entry.is-neutral"));
  assert.ok(!css.includes(".admin-"));
  assert.ok(!legacyEditorialCss.includes(".checkout-"));
  assert.ok(!legacyEditorialCss.includes(".builder-"));
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
  assert.ok(page.includes('className="delivery-time-main">{DELIVERY_TIME_ESTIMATE}</span>'));
  assert.ok(page.includes('className="delivery-time-detail">O prazo começa após a confirmação da loja.</span>'));
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


test("imagem real otimizada está incluída no próprio repositório e no build Cloudflare", async()=>{
  const photo=await readFile(new URL("../public/images/categoria-fatias-editorial.webp", import.meta.url));
  assert.ok(photo.length >= 20000 && photo.length < 130000, "fotografia otimizada para mobile");
  assert.equal(photo.toString("ascii",0,4),"RIFF");
  assert.equal(photo.toString("ascii",8,12),"WEBP");
  assert.ok(page.includes('category.id === "fatias" ? "/images/categoria-fatias-editorial.webp"'));
  assert.ok(page.includes("event.currentTarget.src = cover.cardImage ?? cover.image"));
});

test("v6 mantém os dois arquivos escolhidos com fallback seguro e foto da pipoca inteira",()=>{
  assert.ok(page.includes('"/images/categoria-pipocas-editorial.webp"'));
  assert.ok(page.includes('"/images/categoria-fatias-editorial.webp"'));
  assert.ok(page.includes('categoria-${category.id}-editorial.webp'));
  const v6 = css.slice(css.indexOf("Editorial v6"));
  assert.ok(v6.includes("object-fit: contain;"));
  assert.ok(v6.includes("object-fit: cover;"));
  assert.ok(v6.includes("filter: none;"));
  assert.ok(v6.includes("transform: none;"));
  assert.ok(page.includes("event.currentTarget.src = cover.cardImage ?? cover.image"));
});


test("v7 aproxima a referência aprovada: cartões compactos, fundo chocolate e fotos integradas", () => {
  const v7 = css.slice(css.lastIndexOf("Editorial v7"));
  assert.ok(v7.startsWith("Editorial v7"), "acabamento v7 deve existir e prevalecer sobre v6");
  for (const value of [
    "linear-gradient(143deg, #4d3227 0%, #402a20 57%, #2e1e17 100%)",
    "object-fit: cover;",
    "filter: brightness(.945) saturate(.94) contrast(1.01);",
    "grid-template-columns: minmax(0, 49%) minmax(0, 51%)",
    "height: 180px;",
    "gap: 10px;",
    "filter: none;"
  ]) assert.ok(v7.includes(value), "regra v7 ausente: " + value);
  assert.ok(page.includes("onClick={() => selectCategory(category.id)}"));
  assert.ok(page.includes("event.currentTarget.src = cover.cardImage ?? cover.image"));
});

test("v8 apresenta relógio e refina a hierarquia da entrada sem mudar pedidos", () => {
  const v8 = css.slice(css.lastIndexOf("Editorial v8"));
  assert.ok(v8.startsWith("Editorial v8"));
  for (const detail of [
    ".delivery-time-clock",
    "display: flex;",
    "linear-gradient(145deg, #54372a 0%, #402920 55%, #291912 100%)",
    "color: #fff1e3;",
    "color: #efdbc7;",
    "color: #f3bb83;",
    "font-size: clamp(1.11rem, 4.95vw, 1.34rem);"
  ]) assert.ok(v8.includes(detail), detail);
  assert.ok(page.includes('!activeCategory && <Clock3 className="delivery-time-clock"'));
  assert.ok(page.includes("{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja."));
  assert.ok(page.includes("onClick={() => selectCategory(category.id)}"));
  assert.ok(page.includes('disabled={!available}'));
  assert.ok(page.includes("/images/categoria-pipocas-editorial.webp"));
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(!v8.includes(".menu-entry.has-category"));
});

test("v9 preserva o título, coloca o complemento do prazo abaixo e mantém fotos e cliques", () => {
  const v9 = legacyEditorialCss.slice(legacyEditorialCss.lastIndexOf("Editorial v9"));
  assert.ok(v9.startsWith("Editorial v9"));
  for (const rule of [
    ".delivery-time-main,",
    ".delivery-time-detail {",
    "display: block;",
    "margin-top: 2px;",
    "linear-gradient(145deg, #53372a 0%, #402920 56%, #291913 100%)",
    "font-size: clamp(1.12rem, 4.9vw, 1.34rem)"
  ]) assert.ok(v9.includes(rule), rule);
  assert.ok(page.includes("Escolha o que deseja pedir"));
  assert.ok(page.includes('className="delivery-time-main">{DELIVERY_TIME_ESTIMATE}</span>'));
  assert.ok(page.includes('className="delivery-time-detail">O prazo começa após a confirmação da loja.</span>'));
  assert.ok(page.includes('!activeCategory && <Clock3 className="delivery-time-clock"'));
  assert.ok(page.includes("onClick={() => selectCategory(category.id)}"));
  assert.ok(page.includes("event.currentTarget.src = cover.cardImage ?? cover.image"));
  assert.ok(!v9.includes(".checkout-"));
  assert.ok(!v9.includes(".menu-entry.has-category"));
});

test("barra móvel respeita digitação e telas estreitas sem modificar a ação original", () => {
  const adjustment = css.slice(css.lastIndexOf("Resguardo do teclado"));
  assert.ok(adjustment.startsWith("Resguardo do teclado"));
  assert.ok(adjustment.includes("(pointer: coarse)"));
  assert.ok(adjustment.includes(".storefront:has("));
  assert.ok(adjustment.includes("textarea:focus"));
  assert.ok(adjustment.includes("type=\"tel\""));
  assert.ok(adjustment.includes("type=\"email\""));
  assert.ok(adjustment.includes(".mobile-sticky-bar {\n    display: none;"));
  assert.ok(adjustment.includes("@media (max-width: 359px)"));
  assert.ok(adjustment.includes("min-height: 46px"));
  assert.ok(page.includes("handleStickyAction"));
  assert.ok(page.includes("inlineFinalActionVisible"));
  assert.ok(page.includes("inlineBuilderActionVisible"));
});

test("v8 remove foco azul programático apenas dos títulos e acomoda viewport compacto", () => {
  assert.ok(page.includes('heading.setAttribute("data-editorial-navigation-focus", navigationByKeyboard ? "keyboard" : "pointer")'));
  assert.ok(page.includes('heading.removeAttribute("data-editorial-navigation-focus")'));
  assert.ok(page.includes('heading.focus({ preventScroll: true })'));
  assert.ok(page.includes('window.scrollTo({ top, behavior: "instant" })'));
  assert.ok(css.includes('#step-size[data-editorial-navigation-focus="pointer"]:focus'));
  assert.ok(css.includes('h2[data-editorial-navigation-focus="pointer"]:focus'));
  assert.ok(css.includes('.v7-navigation button:focus-visible'));
  assert.ok(!css.includes('#step-size:focus-visible { outline: none; }'));
  assert.ok(css.includes('@media (max-width: 699px) and (max-height: 700px)'));
  assert.ok(css.includes('height: clamp(214px, 58vw, 308px)'));
  assert.ok(css.includes('border-color: rgba(208, 149, 94, .30)'));
  assert.ok(page.includes('onClick={returnToCategories}'));
  assert.ok(page.includes('onClick={openLimitedCupEdition}>Ver edição limitada'));
  assert.ok(page.includes('R$ 15,90'));
});

test("v7 nomeia lançamento Pipocas Crocantes e dá saída clara em todos os caminhos", () => {
  assert.ok(page.includes('<strong>Pipocas <em>Crocantes</em></strong>'));
  assert.ok(page.includes('<h2>Pipocas <em>Crocantes</em></h2>'));
  assert.ok(page.includes('showLimitedCupView ? "Pipocas Crocantes"'));
  assert.ok(!page.includes("O lado crocante da Luciane"));
  assert.ok(page.includes('function returnToCategories()'));
  assert.ok(page.includes('onClick={returnToCategories}'));
  assert.ok(page.includes('onClick={openLimitedCupEdition}>Ver edição limitada'));
  assert.ok(page.includes('aria-label="Navegação da edição"'));
  assert.ok(page.includes('aria-label="Navegação das pipocas"'));
  assert.ok(page.includes('aria-label="Navegação das fatias"'));
  assert.ok(page.includes('window.history.pushState'));
  assert.ok(page.includes('window.history.state?.lucianeCrocante === true'));
  assert.ok(page.includes('window.scrollTo({ top: 0, behavior: "instant" })'));
  assert.ok(css.includes('.limited-cup-story-heading h2[data-editorial-navigation-focus="pointer"]:focus'));
  assert.ok(css.includes('.v7-navigation button:focus-visible'));
  assert.ok(!css.includes('.limited-cup-story-heading h2:focus-visible {outline:none}'));
});

test("v6 separa lançamento e compra tradicional sem afetar os outros produtos", () => {
  assert.ok(page.includes("const [showLimitedCupView, setShowLimitedCupView] = useState(false)"));
  assert.ok(page.includes("function openLimitedCupEdition()"));
  assert.ok(page.includes('onClick={openLimitedCupEdition}'));
  assert.ok(page.includes('onClick={() => selectCategory(category.id)}'));
  assert.ok(page.includes('setShowLimitedCupView(false);\n    setRequestedCategory(category);'));
  assert.ok(page.includes('if (category === "pipocas") requestEditorialScroll("tamanhos")'));
  assert.ok(page.includes('requestEditorialScroll("edicao-crocante")'));
  assert.ok(page.includes('activeCategory === "pipocas" && showLimitedCupView'));
  assert.ok(page.includes('showLimitedCupView && cart.length === 0 ? "builder-section is-cup-discovery"'));
  assert.ok(css.includes('#configurador.is-cup-discovery > .page-shell > :not(.limited-cup-story)'));

  assert.ok(page.includes('id="edicao-crocante"'));
  assert.ok(page.includes('id="tamanhos"'));
  assert.ok(page.includes('onClick={() => selectCategory("pipocas")}>Prefere os potes recheados?'));
  assert.ok(page.includes('Toque em Ninho ou Chocolate para conhecer cada sabor.'));
  assert.ok(!page.includes("Conhecer os sabores"));
  assert.ok(!page.includes('className="limited-cup-story-primary"'));
  assert.ok(page.includes('aria-pressed={cupFlavorPreview === "ninho"}'));
  assert.ok(page.includes('aria-pressed={cupFlavorPreview === "chocolate"}'));
  assert.ok(page.includes('className="limited-cup-teaser-cta"'));
  assert.ok(page.includes('!showLimitedCupView && !(stickyUsesCheckoutAction'));
  assert.ok(page.includes('setShowLimitedCupView(false);\n    setBuilderEngaged(true);'));
  assert.ok(page.includes('window.scrollTo({ top, behavior: "instant" })'));
  assert.ok(page.includes('setShowLimitedCupView(isEdition)'));
  assert.ok(page.includes('setRequestedCategory(category);'));
  assert.ok(page.includes('setShowLimitedCupView(requestedCategory === "pipocas" && window.history.state?.lucianeCrocante === true)'));
  assert.ok(!page.includes('href="#potes-recheados"'));
  assert.ok(page.includes("R$ 15,90"));
  assert.ok(page.includes("400 ml"));
  assert.ok(page.includes("190 g"));
  assert.ok(page.includes("/images/edicao-crocante-ninho.webp"));
  assert.ok(page.includes("/images/edicao-crocante-chocolate.webp"));
  assert.ok(!page.includes("edicao-crocante-copos-reais.webp"));
  assert.ok(css.includes(".limited-cup-flavor-hint"));
  assert.ok(css.includes(".limited-cup-story-footer > button:focus-visible"));
});

test("v2 de lançamento exige três condições para anunciar disponibilidade", async () => {
  const cfg = await readFile(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");
  assert.ok(cfg.includes("orderingIntegrated: false"));
  assert.ok(cfg.includes("salesApprovedByStore: false"));
  assert.ok(cfg.includes("inventoryVerifiedAvailable: false"));
  assert.ok(cfg.includes("soldOutConfirmed: false"));
  assert.ok(cfg.includes("nowMs < Date.parse(cfg.launchDayStart)"));
  assert.ok(cfg.includes("cfg.orderingIntegrated && cfg.salesApprovedByStore && cfg.inventoryVerifiedAvailable"));
  assert.ok(cfg.includes('return "awaiting-release"'));
  assert.ok(!page.includes("Ainda não há foto do sabor chocolate"));
  assert.ok(!page.includes("Foto ilustrativa de copos maiores"));
});

test("foto clara das Pipocas Gourmet fica restrita à vitrine inicial", async () => {
  const photo = await readFile(new URL("../public/images/categoria-pipocas-editorial-enquadrada-v107.webp", import.meta.url));
  assert.ok(photo.length > 20000 && photo.length < 250000, "WebP leve para iPhone");
  assert.equal(photo.toString("ascii", 0, 4), "RIFF");
  assert.equal(photo.toString("ascii", 8, 12), "WEBP");
  assert.ok(page.includes('category.id === "pipocas" ? "/images/categoria-pipocas-editorial-enquadrada-v107.webp"'));
  assert.ok(page.includes('<img src="/images/categoria-pipocas-editorial.webp" onError='));
  assert.ok(page.includes('category.id === "fatias" ? "/images/categoria-fatias-editorial.webp"'));
  assert.ok(css.includes('background: #d4a988;'));
});

test("cartoes v10: pote enquadrado com respiro e painel chocolate profundo", () => {
  const v10 = css.slice(css.lastIndexOf("Cartoes editoriais v10"));
  assert.ok(v10.includes("object-position: 50% 50%"));
  assert.ok(v10.includes("linear-gradient(145deg, #482d22"));
  assert.ok(v10.includes("filter: none"));
  assert.ok(!v10.includes(".menu-entry.has-category"));
});

test("pipocas usam rolagem suave com respeito ao movimento reduzido; crocantes mantem salto", () => {
  assert.ok(page.includes('if (id === "tamanhos" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)'));
  assert.ok(page.includes('window.scrollTo({ top, behavior: "smooth" })'));
  assert.ok(page.includes('window.scrollTo({ top, behavior: "instant" })'));
  assert.ok(page.includes('className="limited-cup-teaser-shot is-ninho"'));
});

test("fotografias comerciais aprovadas sempre acompanham o codigo e o ZIP do Cloudflare", async () => {
  const names = [
    "categoria-fatias-editorial.webp",
    "categoria-pipocas-editorial-clara.webp",
    "categoria-pipocas-editorial-enquadrada-v107.webp",
    "categoria-pipocas-editorial.webp",
    "edicao-crocante-ninho.webp",
    "edicao-crocante-chocolate.webp",
    "edicao-crocante-textura.webp",
  ];
  for (const name of names) {
    const data = await readFile(new URL(`../public/images/${name}`, import.meta.url));
    assert.ok(data.length >= 18000, `Foto ausente ou incompleta: ${name}`);
    assert.equal(data.toString("ascii", 0, 4), "RIFF", `Formato incorreto: ${name}`);
    assert.equal(data.toString("ascii", 8, 12), "WEBP", `Formato incorreto: ${name}`);
  }
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("/images/categoria-pipocas-editorial.webp"));
  assert.ok(page.includes("/images/edicao-crocante-ninho.webp"));
  assert.ok(page.includes("/images/edicao-crocante-chocolate.webp"));
});

test("v107: fotografia correta, enquadramento central e lancamento em 15/10", async () => {
  const release = await readFile(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("EDIÇÃO LIMITADA · 15/10"));
  assert.ok(page.includes("Estreia quinta, 15/10"));
  assert.ok(!page.includes("16/10"));
  assert.ok(release.includes("2026-10-15T00:00:00-03:00"));
  assert.ok(!release.includes("2026-10-16T00:00:00-03:00"));
  const lastPotRule = css.slice(css.lastIndexOf(".category-option:first-child .category-option-media img"));
  assert.ok(lastPotRule.includes("object-fit: cover"));
  assert.ok(lastPotRule.includes("object-position: 50% 50%"));
});
