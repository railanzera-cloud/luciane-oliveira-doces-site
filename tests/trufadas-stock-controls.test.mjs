import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const admin = read("app/admin/page.tsx");
const stock = read("components/admin-trufadas-stock.tsx");
const availability = read("app/menu-availability.ts");
const publicClient = read("lib/public-menu-availability.ts");
const storefront = read("app/page.tsx");
const catalog = read("app/catalog.ts");
const backend = read("supabase/functions/_shared/commerce-catalog.mjs");

test("painel oferece controle de quantidade independente para Ninho e Chocolate", () => {
  assert.match(admin, /AdminTrufadasStock onChanged=\{reloadMenu\}/);
  assert.match(stock, /Caramelo e Ninho/);
  assert.match(stock, /Caramelo e Chocolate/);
  assert.match(stock, /admin_get_crocante_inventory/);
  assert.match(stock, /admin_set_crocante_inventory/);
  assert.match(stock, /p_version: row.version/);
  assert.match(stock, /p_item_key: row.item_key/);
  assert.match(stock, /p_enabled: draft.enabled/);
  assert.match(stock, /total < row.reserved/);
  assert.match(stock, /Number.isSafeInteger\(total\)/);
  assert.match(stock, /Estoque atualizado com sucesso/);
  assert.doesNotMatch(stock, /\.from\("crocante_inventory"\)\.update/);
});

test("se faltar o estoque remoto, apenas os pacotes falham fechados", () => {
  assert.match(publicClient, /\/rest\/v1\/rpc\/public_crocante_inventory/);
  assert.match(publicClient, /\.catch\(\(\) => null\)/);
  assert.match(availability, /trufadasStock !== undefined/);
  assert.match(availability, /stockChecked = Boolean\(valid\)/);
  assert.match(availability, /remaining === 0 && statuses\[key\] !== "hidden"/);
  assert.match(availability, /statuses\[key\] = "sold_out"/);
  assert.match(availability, /const stockRemaining: Record<string, number> = \{\}/);
});

test("carrinho e finalização fazem conferência de saldos e quantidade", () => {
  assert.match(storefront, /const requested = cart\.filter\(entry => entry\.productId === item\.productId\)/);
  assert.match(storefront, /requested > left/);
  assert.match(storefront, /cupRemaining >= cupQuantity/);
  assert.match(storefront, /qty \+ alreadyInCart > confirmedStock/);
  assert.match(storefront, /latest\.snapshot\.stockChecked/);
  assert.match(storefront, /remainingForFlavor\(productId\)/);
  assert.match(storefront, /cupQuantity >= Math\.min\(99, cupRemaining\)/);
  assert.match(storefront, /cartAvailabilityIssues\(cart, latest\.snapshot\)/);
  assert.match(storefront, /Pacote com zíper/);
});

test("preserva preço, chaves históricas e integração com backend", () => {
  for (const key of ["crocante_copo_ninho", "crocante_copo_chocolate"]) {
    assert.ok(availability.includes(key));
    assert.ok(backend.includes(key));
  }
  assert.match(catalog, /price: 15\.9/);
  assert.match(backend, /priceCents: 1590/);
  assert.match(backend, /size_label: "Pacote"/);
});
