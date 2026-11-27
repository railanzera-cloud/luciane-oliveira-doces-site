import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { SLICES } from "../app/catalog.ts";
import { slicePhotoSources } from "../app/storefront-photos.ts";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("makes popcorn flavor selection explicit", () => {
  assert.match(page, /Escolha os sabores da sua pipoca/);
  assert.match(page, /Ir aos sabores/);
  assert.match(page, /Escolha pelo menos 1 sabor para adicionar ao pedido/);
});

test("starts popcorn and slice choices empty", () => {
  assert.doesNotMatch(page, /DEFAULT_POPCORN_VARIANT_ID|DEFAULT_SLICE_PRODUCT_ID/);
  assert.match(page, /\[popcornVariantId, setPopcornVariantId\] = useState\(""\)/);
  assert.match(page, /\[sliceProductId, setSliceProductId\] = useState\(""\)/);
  assert.match(page, /setPopcornVariantId\(""\)/);
  assert.match(page, /setSliceProductId\(""\)/);
});

test("guides dependent steps only after a conscious first choice", () => {
  assert.match(page, /Primeiro escolha o tamanho\. Depois, os sabores serão liberados/);
  assert.match(page, /const disabled = waitingForSize \|\| \(!available && !selected\) \|\| limitDisabled/);
  assert.match(page, /Escolha como prefere sua fatia e confira a quantidade/);
  assert.match(page, /disabled=\{!sliceReady\}/);
});

test("keeps a second product easy to add beside the receiving options", () => {
  assert.doesNotMatch(page, /id="item-adicionado"/);
  assert.match(page, /className="boutique-added-continuity"/);
  assert.match(page, /Quer completar seu pedido\?/);
  assert.match(page, /\{checkoutComplementItems\.map\(\(id\) => \{/);
  assert.match(page, /if \(id === "gourmet"\) startAnother\("pipocas"\)/);
  assert.match(page, /else if \(id === "fatias"\) startAnother\("fatias"\)/);
  assert.match(page, /else if \(id === "trufadas"\) startAnotherCrocantes\(\)/);
  assert.match(page, /\{!addedNotice && <div className="cart-add-more">/);
  assert.match(page, /setAddedNotice\(null\);\s+setFulfillment/);
  assert.match(page, /cart-add-options \$\{STORE_CONFIG\.enabledExtras\.drinks \? "" : "without-drinks"\}/);
  assert.match(page, /const destination = wasEditing \? "carrinho" : "recebimento"/);
});

test("lets the sticky action add a ready second item instead of skipping to checkout", () => {
  assert.match(page, /const builderFlowActive = !showLimitedCupView && activeCategory !== "natal" && Boolean\(activeCategory && \(editingId \|\| builderEngaged \|\| draftReady \|\| !cart\.length\)\)/);
  assert.match(page, /const stickyUsesCheckoutAction = !builderFlowActive/);
  assert.match(page, /function stickyBuilderAction\(\)/);
  assert.match(page, /function handleStickyAction\(\)/);
  assert.match(page, /onClick=\{handleStickyAction\}/);
  assert.match(page, /const stickyIsCheckoutReady = stickyUsesCheckoutAction && !stickyShowsOrderReview && checkoutReady/);
  assert.match(page, /setBuilderEngaged\(true\)/);
  assert.match(page, /setBuilderEngaged\(false\)/);
  assert.match(page, /stickyButtonLabel/);
  assert.match(page, /Escolher tamanho/);
  assert.match(page, /Escolher minha fatia/);
});

test("exposes clear active, complete, and locked step states", () => {
  assert.match(page, /type StepState = "active" \| "complete" \| "locked"/);
  assert.match(page, /step-state-\$\{sliceProductStepState\}/);
  assert.match(page, /step-state-\$\{sliceQuantityStepState\}/);
  assert.match(page, /<span className="sr-only">Etapa \{number\}\{state === "complete" \? " concluída" : ""\}<\/span>/);
});

test("keeps below-fold product images lazy and responsive", async () => {
  assert.match(page, /const photo = slice\.cardImage \?\? slice\.image/);
  assert.match(page, /src=\{photo\} srcSet=\{slicePhotoSources\(photo\)\} sizes=\{SLICE_PHOTO_SIZES\}/);
  assert.match(page, /const priority = index === 0 \|\| \(lastSlicesIds\.has\(slice\.id\) && available\)/);
  assert.match(page, /loading=\{priority \? "eager" : "lazy"\}[\s\S]+fetchPriority=\{priority \? "high" : "low"\}/);
  for (const slice of SLICES) {
    const source = slice.cardImage ?? slice.image;
    const variants = slicePhotoSources(source)?.split(', ').map(entry => entry.split(' ')[0]);
    assert.ok(variants, slice.id);
    assert.equal(variants.at(-1), source);
    // Exceções nominais: mídias aprovadas entregues no ZIP manual, ausentes do Git.
    // O contrato exige hashes/tamanhos exatos no pacote de publicação; o core é NÃO PUBLICAR.
    const externalContract = {"fatia-bombom-uva-massa-branca":"MIDIAS-EXTERNAS-MASSA-BRANCA-20261126.json","fatia-oreo-ninho-chocolate":"MIDIAS-EXTERNAS-OREO-20261127.json"}[slice.id];
    if (externalContract) {
      const contract = JSON.parse(await readFile(new URL("../docs/continuidade/" + externalContract, import.meta.url), "utf8"));
      assert.equal(source, "/" + contract.source);
      assert.deepEqual(variants, contract.files.map(file => "/" + file.path));
      assert.deepEqual(contract.files.map(file => file.width), [360,576,1122]);
      const original = contract.files.at(-1);
      for (const file of contract.files) {
        assert.match(file.sha256, /^[0-9a-f]{64}$/);
        assert.ok(file.bytes > 0 && file.bytes <= original.bytes);
        if (file.path !== original.path) assert.ok(file.bytes < original.bytes);
        const bytes = await readFile(new URL("../public/" + file.path, import.meta.url)).catch(error => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        if (bytes) {
          assert.equal(bytes.length, file.bytes);
          assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
        }
      }
      continue;
    }
    const original = await readFile(new URL(`../public${source}`, import.meta.url));
    for (const variant of variants.slice(0, -1)) {
      const resized = await readFile(new URL(`../public${variant}`, import.meta.url));
      assert.ok(resized.length < original.length, variant);
    }
  }
  const drinks = await readFile(new URL("../components/drink-complements.tsx", import.meta.url), "utf8");
  assert.match(drinks,/src=\{drink\.image\}/);
  assert.match(drinks,/loading="lazy" decoding="async"/);
});

test("explains quantities for repeated and different combinations", () => {
  assert.match(page, /Quantos potes desta combinação\?/);
  assert.match(page, /Quantas fatias deste sabor\?/);
  assert.match(page, /Para outro sabor, adicione este item e escolha a próxima fatia/);
});

test("additional category labels use actual items in cart, not the last added category", async () => {
  const ts = await import("typescript");
  const file = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let helper = null;
  for (const stmt of file.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === "addMoreButtonLabel") helper = stmt;
  }
  assert.ok(helper, "helper for the additional-product labels should exist");
  const emitted = ts.transpileModule(helper.getText(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const decide = new Function("POPCORN", "SLICES", emitted + "; return addMoreButtonLabel;")(
    {id: "pipoca-gourmet"}, [{id: "fatia-chocolate-morango"}, {id: "fatia-ninho-morango"}],
  );
  const item = (productId) => ({productId});
  const scenarios = [
    [[], "Adicionar pote recheado", "Adicionar fatia"],
    [[item("pipoca-gourmet")], "Outro pote recheado", "Adicionar fatia"],
    [[item("fatia-chocolate-morango")], "Adicionar pote recheado", "Outra fatia"],
    [[item("crocante-ninho")], "Adicionar pote recheado", "Adicionar fatia"],
    [[item("crocante-chocolate"), item("fatia-ninho-morango")], "Adicionar pote recheado", "Outra fatia"],
    [[item("pipoca-gourmet"), item("fatia-chocolate-morango"), item("crocante-ninho")], "Outro pote recheado", "Outra fatia"],
  ];
  for (const [cart, popcorn, slice] of scenarios) {
    assert.equal(decide("pipocas", cart), popcorn);
    assert.equal(decide("fatias", cart), slice);
  }
  // A seção de continuidade e a área do carrinho devem usar a mesma lógica.
  assert.match(page, /\{addMoreButtonLabel\("fatias", cart\)\}/);
  assert.match(page, /\{addMoreButtonLabel\("pipocas", cart\)\}/);
  // O novo módulo usa o MESMO helper do carrinho para não inventar "outro".
  assert.match(page, /id === "gourmet" \? addMoreButtonLabel\("pipocas", cart\)/);
  assert.match(page, /id === "fatias" \? \(addedNotice\?\.category === "natal" \? "Adicionar fatia artesanal" : addMoreButtonLabel\("fatias", cart\)\)/);
  // O atalho de Trufadas permanece, com apresentação contextual quando recém-adicionado.
  assert.equal((page.match(/cartContainsCrocantes \? "Adicionar outro pacote" : "Adicionar pacote Trufado"/g) ?? []).length, 1);
  assert.match(page, /cartContainsCrocantes \? "Outro pacote Trufado" : "Pipocas Trufadas"/);
});
