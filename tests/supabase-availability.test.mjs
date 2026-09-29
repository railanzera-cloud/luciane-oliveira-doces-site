import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const menu = await readFile(new URL("../app/menu-availability.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const admin = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const service = await readFile(new URL("../lib/menu-availability-client.ts", import.meta.url), "utf8");
const publicAvailability = await readFile(new URL("../lib/public-menu-availability.ts", import.meta.url), "utf8");
const config = await readFile(new URL("../lib/supabase-config.ts", import.meta.url), "utf8");
const client = await readFile(new URL("../lib/supabase.ts", import.meta.url), "utf8");
const hook = await readFile(new URL("../hooks/use-menu-availability.ts", import.meta.url), "utf8");
const seed = await readFile(new URL("../supabase_seed.sql", import.meta.url), "utf8");
const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

const expectedKeys = [
  "category_pipocas",
  "category_fatias",
  "popcorn_size_350ml",
  "popcorn_size_500ml",
  "popcorn_size_750ml",
  "popcorn_size_1l",
  "popcorn_flavor_leitinho",
  "popcorn_flavor_nutella",
  "popcorn_flavor_kinder_bueno",
  "popcorn_flavor_kinder_bueno_crisp",
  "popcorn_flavor_choco_cookies_branco",
  "popcorn_flavor_choco_cookies_leite",
  "popcorn_flavor_ovomaltine",
  "slice_chocolate_morango",
  "slice_ninho_morango",
  "slice_prestigio",
  "slice_chocolate_maracuja",
  "slice_chocolatudo",
  "slice_chocolate_cenoura",
];

test("defines stable non-visual identifiers for every currently public menu item", () => {
  for (const itemKey of expectedKeys) {
    assert.match(menu, new RegExp(`"${itemKey}"`), `${itemKey} deve existir no mapeamento`);
  }
  assert.match(menu, /Record<string, string>/);
  assert.doesNotMatch(menu, /coca-cola|fanta-laranja/);
});

test("seeds only the two public categories, four sizes, seven flavors and six slices", () => {
  const insertedKeys = [...seed.matchAll(/^\s*\('([^']+)',/gm)].map((match) => match[1]);
  assert.deepEqual(insertedKeys, expectedKeys);
  assert.equal(new Set(insertedKeys).size, 19);
  assert.equal((seed.match(/'available'\)/g) ?? []).length, 19);
  assert.match(seed, /on conflict \(item_key\) do update/i);
  assert.doesNotMatch(seed, /coca|fanta|refrigerante|acetato|cone|torta|salgado|festival/i);

  const conflictUpdate = seed.slice(seed.toLowerCase().indexOf("on conflict"));
  assert.doesNotMatch(conflictUpdate, /status\s*=/i, "reexecutar o seed não deve reabrir itens alterados");
});

test("uses only the two explicitly public Supabase build values", () => {
  assert.match(vite, /process\.env\.SUPABASE_URL/);
  assert.match(vite, /process\.env\.SUPABASE_PUBLISHABLE_KEY/);
  assert.match(client, /createClient\(url, publishableKey/);
  assert.ok(config.includes('replace(/\\/rest\\/v1\\/?$/i, "")'));
  assert.doesNotMatch(
    `${client}\n${vite}\n${service}\n${publicAvailability}\n${config}`,
    /service_role|SUPABASE_SECRET|sb_secret_/i,
  );
});

test("keeps the public menu fetch small and compatible with publishable keys", () => {
  assert.match(publicAvailability, /apikey: publishableKey/);
  assert.match(publicAvailability, /cache: "no-store"/);
  assert.doesNotMatch(publicAvailability, /Authorization|@supabase\/supabase-js/);
  assert.match(publicAvailability, /Promise\.all\(/);
});

test("keeps a non-blocking local fallback and refreshes on return to the tab", () => {
  assert.match(hook, /createFallbackAvailability\(\)/);
  assert.match(hook, /const fallback = snapshotRef\.current/);
  assert.match(hook, /console\.error\("\[Luciane Doces\] Falha ao consultar disponibilidade; mantendo o último estado seguro\./);
  assert.match(hook, /window\.addEventListener\("focus"/);
  assert.match(hook, /document\.addEventListener\("visibilitychange"/);
  assert.match(page, /useMenuAvailability\(\)/);
});

test("revalidates the complete cart immediately before the backend registration", () => {
  const finishStart = page.indexOf("async function finishOnWhatsApp");
  const finishEnd = page.indexOf("function stickyBuilderAction", finishStart);
  const finish = page.slice(finishStart, finishEnd);

  assert.notEqual(finishStart, -1);
  assert.match(finish, /await refreshAvailability\(\)/);
  assert.match(finish, /if \(latest\.usedFallback\)/);
  assert.match(finish, /Não foi possível confirmar a disponibilidade agora/);
  assert.match(finish, /cartAvailabilityIssues\(cart, latest\.snapshot\)/);
  assert.match(finish, /!latest\.snapshot\.ordersOpen/);
  assert.match(finish, /Item indisponível/);
  assert.ok(finish.indexOf("await refreshAvailability()") < finish.indexOf("await createWhatsAppOrder"));
  assert.equal((page.match(/window\.location\.assign\(/g) ?? []).length, 0);
});

test("marks remote cart failures without silently deleting those items", () => {
  assert.match(page, /const cartIssues = useMemo/);
  assert.match(page, /cart-item \$\{itemIssue \? "is-unavailable"/);
  assert.match(page, /Item indisponível/);
  assert.match(page, /Edite ou remova para continuar/);
  assert.match(page, /summary-unavailable/);
});

test("admin protects the panel with Supabase Auth and rolls back failed saves", () => {
  assert.match(admin, /supabase\.auth\.getSession\(\)/);
  assert.match(admin, /supabase\.auth\.onAuthStateChange/);
  assert.match(admin, /supabase\.auth\.signInWithPassword/);
  assert.match(admin, /supabase\.auth\.signOut\(\)/);
  assert.match(admin, /if \(!session\) \{/);
  assert.match(admin, /setAvailability\(\(current\) => \(\{[\s\S]*?\[item\.itemKey\]: nextStatus/);
  assert.match(admin, /\[item\.itemKey\]: previousStatus/);
  assert.match(admin, /pendingKeys\.includes\(item\.itemKey\)/);
  assert.match(service, /\.update\(\{[\s\S]*?status,[\s\S]*?updated_by: userId/);
});

test("admin controls orders_open and the three exact availability states", () => {
  assert.match(service, /from\("store_settings"\)[\s\S]*?eq\("key", "orders_open"\)/);
  assert.match(service, /updated_by: userId/);
  assert.match(admin, /Disponíveis/);
  assert.match(admin, /Fechados/);
  assert.match(admin, /"available", label: "Disponível"/);
  assert.match(admin, /"sold_out", label: "Esgotado"/);
  assert.match(admin, /"hidden", label: "Oculto"/);
});
