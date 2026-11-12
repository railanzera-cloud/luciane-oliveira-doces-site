import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(path, "utf8");
const admin = source("app/admin/page.tsx");
const availability = source("app/menu-availability.ts");
const catalog = source("supabase/functions/_shared/drinks-catalog.mjs");
const client = source("lib/menu-availability-client.ts");
const checkout = source("components/drink-complements.tsx");

test("Painel inclui aba Bebidas com controle individual para os quatro SKUs remotos", () => {
  assert.match(admin, /DRINK_CATEGORY_KEY/);
  assert.match(admin, /const drinkItems = MENU_AVAILABILITY_ITEMS\.filter\(item => item\.categoryKey === DRINK_CATEGORY_KEY && item\.itemType === "product"\)/);
  assert.match(admin, /id="admin-availability-tab-drinks"/);
  assert.match(admin, /aria-selected=\{availabilitySection === "drinks"\}/);
  assert.match(admin, /onClick=\{\(\) => selectAvailabilitySection\("drinks"\)\}/);
  assert.match(admin, /id="admin-availability-panel-drinks"/);
  assert.match(admin, /role="tabpanel" id="admin-availability-panel-drinks"/);
  assert.match(admin, /\{drinkItems\.map\(item => \(/);
  assert.match(admin, /<AvailabilityControl key=\{item\.itemKey\} item=\{item\}/);
  assert.match(admin, /onChange=\{status => changeItemStatus\(item, status\)\}/);
  assert.match(admin, /countReady\(drinkItems\)/);
});

test("Admin salva em menu_availability existente, com autenticação e sem seed nem mudança de preço", () => {
  assert.match(client,/\.from\("menu_availability"\)\s*\.update\(\{/);
  assert.match(client,/\.eq\("item_key", item\.itemKey\)/);
  assert.match(client,/\.maybeSingle\(\)/);
  assert.match(client,/if \(!data\) \{/);
  assert.match(admin,/controlsUnavailable \|\| pendingKeys\.includes\(item\.itemKey\)/);
  assert.match(admin,/if \(!session \|\| controlsUnavailable \|\| pendingKeys\.includes\(item\.itemKey\)\) return/);
  assert.doesNotMatch(admin,/\bpriceCents\s*=/);
});

test("Quatro bebidas vêm do catálogo Edge e começam ocultas quando disponibilidade não é comprovada", () => {
  const ids=["coca-cola-zero-220","fanta-laranja-220","guarana-antarctica-200","coca-cola-350"];
  const module=source("app/catalog.ts");
  assert.equal((catalog.match(/itemKey: "drink_/g)||[]).length,4);
  for(const id of ids) assert.ok(catalog.includes(id), id);
  assert.match(module,/\.\.\.Object\.values\(DRINK_CATALOG\)\.map/);
  assert.match(availability,/export const DRINK_CATEGORY_KEY = "extras_drinks"/);
  assert.match(availability,/Object\.values\(DRINK_CATALOG\)\.map\(drink => \[drink\.id,drink\.itemKey\]\)/);
  assert.match(availability,/for \(const drink of DRINKS\) statuses\[DRINK_ITEM_KEYS\[drink\.id\]\] = "hidden"/);
  assert.match(checkout,/if \(!visible\.length \|\| !availability\.ordersOpen\) return null/);
  assert.match(checkout,/drinkStatus\(availability, drink\.id\) !== "hidden"/);
});

test("Controle mantém estados Disponível, Esgotado e Oculto e não cria categoria permanente", () => {
  assert.match(admin, /\{ value: "available", label: "Disponível" \}/);
  assert.match(admin, /\{ value: "sold_out", label: "Esgotado" \}/);
  assert.match(admin, /\{ value: "hidden", label: "Oculto" \}/);
  assert.match(admin,/Bebidas só aparecem como complemento|As bebidas só aparecem como complemento/);
  assert.doesNotMatch(availability,/DRINK_CATEGORY_KEY.*itemType: "category"/);
});
