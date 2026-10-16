import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/admin-results-dates.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { belemToday, shiftCalendarDay, resultsPresetRange, resultsRangeError, formatResultsRange } =
  await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("dia em Belém não usa UTC e ontem é dia inteiro", () => {
  assert.equal(belemToday(new Date("2026-10-17T02:30:00Z")), "2026-10-16");
  assert.deepEqual(resultsPresetRange("today", "2026-10-16"),
    {startDate:"2026-10-16",endDate:"2026-10-16"});
  assert.deepEqual(resultsPresetRange("yesterday", "2026-10-16"),
    {startDate:"2026-10-15",endDate:"2026-10-15"});
});
test("7, 30 e 90 dias incluem hoje e contam todos os dias civis", () => {
  assert.deepEqual(resultsPresetRange("last7", "2026-10-16"),
    {startDate:"2026-10-10",endDate:"2026-10-16"});
  assert.deepEqual(resultsPresetRange("last30", "2026-10-16"),
    {startDate:"2026-09-17",endDate:"2026-10-16"});
  assert.deepEqual(resultsPresetRange("last90", "2026-10-16"),
    {startDate:"2026-07-19",endDate:"2026-10-16"});
  assert.equal(shiftCalendarDay("2024-03-01", -1), "2024-02-29");
});
test("personalizado valida ordem, datas reais, limites e futuras", () => {
  const today = "2026-10-16";
  assert.equal(resultsRangeError({startDate:today,endDate:today}, today), null);
  assert.match(resultsRangeError({startDate:"2026-10-17",endDate:today}, today), /inicial/);
  assert.match(resultsRangeError({startDate:"2026-02-30",endDate:today}, today), /válidas/);
  assert.match(resultsRangeError({startDate:today,endDate:"2026-10-17"}, today), /futura/);
  assert.match(resultsRangeError({startDate:"2010-01-01",endDate:today}, today), /3.660/);
  assert.equal(formatResultsRange({startDate:"2026-10-15",endDate:"2026-10-16"}),
    "15/10/2026 a 16/10/2026");
});
test("consulta mantém segurança e filtro por dias civis de Belém", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261016220000_admin_results_custom_dates_v3.sql", import.meta.url), "utf8");
  const client = await readFile(new URL("../lib/admin-results-client.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../components/admin-results-panel.tsx", import.meta.url), "utf8");
  assert.match(sql, /lod_require_authenticated_staff\(\)/);
  assert.match(sql, /admin_get_results_overview_v3\(p_start_date date, p_end_date date\)/);
  assert.match(sql, /AT TIME ZONE 'America\/Belem'/);
  assert.match(sql, /o\.created_at < v_end/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_get_results_overview_v3\(date,date\)/);
  assert.ok(!/SELECT\s+o\.\*/i.test(sql));
  assert.match(client, /p_start_date: range\.startDate/);
  assert.match(client, /p_end_date: range\.endDate/);
  for (const label of ["Hoje", "Ontem", "7 dias", "30 dias", "90 dias", "Personalizado", "Aplicar período"])
    assert.ok(ui.includes(label), label);
  assert.ok(ui.includes('type="date"'));
  assert.ok(!ui.includes("confirmOfflinePayment("));
});
