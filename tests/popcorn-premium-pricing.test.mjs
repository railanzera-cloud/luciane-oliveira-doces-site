import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const catalog = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const { POPCORN, POPCORN_PRICING_GROUPS, popcornPrice } = catalog;

test("exactly eight official flavors, groups and descriptions", () => {
  assert.deepEqual(POPCORN.options.map(({ name, pricingGroup }) => [name, pricingGroup]), [
    ["Leitinho", 1], ["Choco Nute", 1], ["Ovomaltine", 1], ["Kinder Bueno", 2],
    ["Choco Cookies Branco", 2], ["Choco Cookies ao Leite", 2], ["Crispy Bueno", 3], ["Nutella", 3],
  ]);
  for (const [id, text] of [["choco-nute", "Creme de avelã com cacau."],
    ["kinder-bueno-crisp", "Creme de Bueno com pedaços crocantes."],
    ["choco-cookies-branco", "Creme branco de cookies com biscoito cookies."]]) {
    assert.equal(POPCORN.options.find((option) => option.id === id).description, text);
  }
});

test("all nine official prices and active size limits are configured once", () => {
  assert.deepEqual(POPCORN_PRICING_GROUPS, {
    1: { "500ml": 25, "750ml": 39, "1l": 49 },
    2: { "500ml": 30, "750ml": 45, "1l": 55 },
    3: { "500ml": 33, "750ml": 48, "1l": 58 },
  });
  assert.deepEqual(POPCORN.variants.filter((variant) => !variant.retired).map(({ id, maxOptions }) => [id, maxOptions]),
    [["500ml", 2], ["750ml", 2], ["1l", 3]]);
  for (const size of ["500ml", "750ml", "1l"]) {
    assert.equal(popcornPrice(size), POPCORN_PRICING_GROUPS[1][size]);
    for (const a of POPCORN.options) for (const b of POPCORN.options) {
      const expected = POPCORN_PRICING_GROUPS[Math.max(a.pricingGroup, b.pricingGroup)][size];
      assert.equal(popcornPrice(size, [a.id, b.id]), expected);
      assert.equal(popcornPrice(size, [b.id, a.id]), expected);
    }
  }
  assert.throws(() => popcornPrice("350ml", ["leitinho"]));
  assert.throws(() => popcornPrice("1l", ["unknown"]));
});

test("fixed surcharge logic, badge and copy have been removed from the shipped app", async () => {
  for (const file of ["app/catalog.ts", "app/page.tsx", "app/globals.css"]) {
    const contents = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(contents, /priceAdjustment|optionPriceAdjustment|flavor-surcharge|premium-flavor-notice|Kinder Bueno Crisp|Creme branco com cookies\./);
  }
});

test("incremental Supabase script only adds the new item and renames the existing label", async () => {
  const sql = await readFile(new URL("../scripts/supabase-add-choco-nute.sql", import.meta.url), "utf8");
  assert.equal((sql.match(/insert into/gi) ?? []).length, 1);
  assert.match(sql, /'popcorn_flavor_choco_nute'/);
  assert.match(sql, /on conflict \(item_key\) do nothing/i);
  assert.match(sql, /set name = 'Crispy Bueno'/);
  assert.doesNotMatch(sql, /create table|alter table|create policy|drop|delete|set status|service_role|sb_secret_/i);
});
