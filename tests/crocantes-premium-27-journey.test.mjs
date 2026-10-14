import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx"),css=read("app/storefront-vitrine-editorial-experiment.css");
test("barra Crocantes orienta sabor/quantidade sem duplicar botao visivel",()=>{
  assert.ok(page.includes('const cupBuilderFlowActive = showLimitedCupView && cupSalesEnabled'));
  assert.ok(page.includes('!cupFlavorPreview ? "Escolher meu sabor"'));
  assert.ok(page.includes('cupInlineActionVisible'));
  assert.ok(page.includes('setCupInlineActionVisible(Boolean(entry?.isIntersecting))'));
  assert.ok(page.includes('typeof cupBuilderFlowActive !== "undefined" && cupBuilderFlowActive) handleCupPurchaseAction()'));
  assert.ok(page.includes('className={\`mobile-sticky-bar'));
});
test("selecao de sabor encaminha diretamente para a proxima etapa",()=>{
  assert.ok(page.includes('requestScroll("crocantes-sabores")'));
  assert.ok(page.includes('requestScroll("crocantes-quantidade")'));
  assert.ok(page.includes('id="crocantes-sabores"'));
  assert.ok(page.includes('id="crocantes-quantidade"'));
  assert.ok(page.includes('Selecionado · fechar detalhes'));
  assert.ok(page.includes('onClick={handleCupPurchaseAction}'));
});
test("copo adicionado usa o checkout e continuidade existentes",()=>{
  assert.ok(page.includes('setAddedNotice({\n      category: "pipocas",\n      productId: product.id'));
  assert.ok(page.includes('setShowLimitedCupView(false)'));
  assert.ok(page.includes('requestScroll("recebimento")'));
  assert.ok(page.includes('function startAnotherCrocantes()'));
  assert.equal((page.match(/className="crocantes-cross-sell"/g)||[]).length,2);
  assert.ok(page.includes('cupCanBeAddedFromCheckout && <Button'));
  assert.ok(css.includes('.boutique-added-other-actions.has-crocantes-option'));
});
test("carrinho e servidor não possuem mais a data como trava",()=>{
  const rel=read("app/limited-cup-release.ts");
  const backend=read("supabase/functions/_shared/commerce-catalog.mjs");
  assert.ok(rel.includes('if (!ordersOpen) return "closed"'));
  assert.ok(backend.includes('priceCents: 1590'));
  assert.doesNotMatch(backend,/CROCANTES_OPEN_AT_MS/);
  assert.ok(page.includes('createWhatsAppOrder({'));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
