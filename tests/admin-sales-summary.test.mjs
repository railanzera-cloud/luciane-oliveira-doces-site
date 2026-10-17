import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const code = await readFile(new URL("../lib/admin-sales-model.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
}}).outputText;
const { parseAdminSalesSummary } =
  await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
const range = {startDate:"2026-10-16",endDate:"2026-10-16"};
const sample = () => ({
  period_start:"2026-10-16",period_end:"2026-10-16",generated_at:"2026-10-16T21:00:00Z",
  scope:"orders_registered_in_panel",orders_created:13,
  completed_paid_orders:12, completed_paid_amount:"450.58",
  completed_unpaid_orders:1, completed_unpaid_amount:"30.00",
  paid_in_progress_orders:0,paid_in_progress_amount:0,
  previous_completed_paid_orders:58,previous_completed_paid_amount:"2466.77",
});

test("resumo financeiro computa somente concluídos e pagos e separa pedidos antigos",()=>{
  const result=parseAdminSalesSummary(sample(),range);
  assert.equal(result.completed_paid_orders,12);
  assert.equal(result.completed_paid_amount,450.58);
  assert.equal(result.completed_unpaid_amount,30);
  assert.equal(result.previous_completed_paid_orders,58);
});
test("não aceita período diferente, campos ausentes nem soma de concluídos incoerente",()=>{
  assert.throws(()=>parseAdminSalesSummary({...sample(),period_start:"2026-10-15"},range),/consistentes/);
  assert.throws(()=>parseAdminSalesSummary({...sample(),completed_paid_amount:null},range),/consistentes/);
  assert.throws(()=>parseAdminSalesSummary({...sample(),completed_paid_orders:14},range),/consistentes/);
});
test("RPC restringe acesso e contabiliza somente pedido efetivamente pago e concluído",async()=>{
  const sql=await readFile(new URL("../supabase/migrations/20261016224500_admin_sales_summary_v1.sql",import.meta.url),"utf8");
  const client=await readFile(new URL("../lib/admin-sales-client.ts",import.meta.url),"utf8");
  const ui=await readFile(new URL("../components/admin-results-panel.tsx",import.meta.url),"utf8");
  assert.match(sql,/lod_require_authenticated_staff\(\)/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.admin_get_sales_summary_v1\(date,date\)/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.admin_get_sales_summary_v1\(date,date\) TO authenticated/);
  assert.match(sql,/created_in_range AND status='completed' AND payment='paid'/);
  assert.match(sql,/previously_created_completed_in_range/);
  assert.ok(!/SELECT\s+o\.\*/i.test(sql));
  assert.match(client,/client\.rpc\("admin_get_sales_summary_v1"/);
  assert.match(ui,/Vendas concluídas e pagas/);
  assert.match(ui,/Concluídos sem pagamento confirmado/);
  assert.match(ui,/Pagos, mas ainda não concluídos/);
  assert.match(ui,/Pedidos anteriores finalizados neste período/);
  assert.match(ui,/useState<"sales" \| "signals" \| "site">\("sales"\)/);
  assert.match(ui,/resultsPresetRange\("today"\)/);
  assert.match(ui,/Sinais de anúncios/);
  assert.match(ui,/Registros do site/);
});
