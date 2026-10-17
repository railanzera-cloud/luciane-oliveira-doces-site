import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("painel conserva estoque das Trufadas junto ao filtro completo de vendas", async () => {
  const admin = await readFile(new URL("../app/admin/page.tsx", import.meta.url),"utf8");
  const sales = await readFile(new URL("../components/admin-results-panel.tsx", import.meta.url),"utf8");
  const pkg = await readFile(new URL("../components/admin-trufadas-stock.tsx", import.meta.url),"utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url),"utf8");
  assert.match(admin, /AdminResultsPanel/);
  assert.match(admin, /AdminTrufadasStock/);
  assert.match(sales, /loadAdminSalesSummary\(client, range\)/);
  assert.match(sales, /loadAdminResults\(client, range\)/);
  assert.match(sales, /Período exibido/);
  assert.match(sales, /Vendas concluídas e pagas/);
  assert.match(sales, /Sinais de anúncios/);
  assert.match(sales, /Registros do site/);
  assert.match(pkg, /crocante/i);
  assert.match(css, /admin-results-sales-total/);
  assert.match(css, /admin-stock-grid/);
});

test("filtros reintroduzidos usam somente consultas SQL sem mudar pedidos", async () => {
  for (const path of [
    "../supabase/migrations/20261016220000_admin_results_custom_dates_v3.sql",
    "../supabase/migrations/20261016224500_admin_sales_summary_v1.sql",
  ]) {
    const sql = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM public\.orders|UPDATE public\.orders/i);
    assert.match(sql, /lod_require_authenticated_staff\(\)/);
    assert.match(sql, /REVOKE ALL ON FUNCTION/);
  }
});
