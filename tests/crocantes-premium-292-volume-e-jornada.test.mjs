import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const page=readFileSync("app/page.tsx","utf8"),catalog=readFileSync("app/catalog.ts","utf8"),css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("pacotes P M G mostram preços sem gramagem inventada",()=>{
  assert.match(page,/Pacotes P, M e G/);
  assert.match(page,/TRUFADA_SIZES\.map/);
  assert.doesNotMatch(page,/190\s*g|187\s*g|173\s*g|240\s*g/);
  assert.match(catalog,/label: "Pacote P"/);
  assert.match(catalog,/label: "Pacote M"/);
  assert.match(catalog,/label: "Pacote G"/);
  const q=quoteCartItems([{product_id:"trufada-coco-queimado",variant_id:"g",option_ids:[],quantity:2}]);
  assert.equal(q.subtotalCents,3780);
  assert.equal(q.items[0].size_label,"Pacote G");
});
test("checkout mantém tamanho e pagamento distinto",()=>{
  assert.match(page,/variantId: variant\.id/);
  assert.match(page,/currency\.format\(\(cupVariant\?\.price/);
  assert.match(page,/requestScroll\("crocantes-quantidade"\)/);
  assert.match(css,/prefers-reduced-motion: reduce/);
});
