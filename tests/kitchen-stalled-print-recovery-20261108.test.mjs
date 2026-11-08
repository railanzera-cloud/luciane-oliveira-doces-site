import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261108230957_kitchen_manual_stuck_print_recovery.sql", "utf8");
const panel = readFileSync("components/admin-orders-panel.tsx", "utf8");
const health = readFileSync("lib/kitchen-print-health.ts", "utf8");
const api = readFileSync("lib/admin-orders-client.ts", "utf8");
const qz = readFileSync("lib/qz-print-client.ts", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("stalled recovery exige ação explícita, confirmação física e mais de 5 minutos", () => {
  assert.match(sql, /p_action IS NULL OR p_action NOT IN \('paper_confirmed', 'retry_no_paper'\)/);
  assert.match(sql, /'CONFIRMO_QUE_O_PAPEL_SAIU'/);
  assert.match(sql, /'CONFIRMO_QUE_O_PAPEL_NAO_SAIU'/);
  assert.match(sql, /p_acknowledgement IS DISTINCT FROM v_confirmation/);
  assert.match(sql, /public\.crm_staff_access s WHERE s\.user_id = v_actor/);
  assert.match(sql, /staff_access_required/);
  assert.match(sql, /SELECT \* INTO v_job FROM public\.print_jobs WHERE id=p_job_id FOR UPDATE;/);
  assert.match(sql, /v_job\.status <> 'printing'/);
  assert.match(sql, /claimed_at > now\(\) - INTERVAL '5 minutes'/);
  assert.match(sql, /print_job_not_stale_or_already_resolved/);
});

test("sem papel encerra só claim antigo e enfileira uma única nova tentativa atômica", () => {
  assert.match(sql, /another_active_print_job_exists/);
  assert.match(sql, /public\.lod_kitchen_print_eligible\(v_order\)/);
  assert.match(sql, /v_order\.created_at>=c\.accept_new_after/);
  assert.match(sql, /status='cancelled', claim_token=NULL/);
  assert.match(sql, /job_key,kind,requested_by/);
  assert.match(sql, /'recovery:' \|\| v_job\.id::text, 'initial', v_actor/);
  assert.match(sql, /kitchen_print_recovery_audit/);
  assert.match(sql, /order_uuid,actor_id,action,new_job_id/);
  assert.doesNotMatch(sql, /UPDATE public\.orders|SET order_status|SET payment_status/i);
});

test("papel confirmado registra a decisão humana sem segundo trabalho", () => {
  assert.match(sql, /status='printed', printed_at=now\(\), claim_token=NULL/);
  assert.match(sql, /confirmada manualmente pela equipe/);
  assert.match(sql, /'confirmed_manually'/);
  assert.match(sql, /'pending_new_job'/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.kitchen_print_recovery_audit FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_recover_stalled_print_job\(uuid,text,text\) FROM PUBLIC,anon/);
});

test("alerta mostra número e opções, sem reimpressão automática por toque único", () => {
  assert.match(health, /loadStalledKitchenPrintJobs/);
  assert.match(health, /\.eq\("status", "printing"\)/);
  assert.match(health, /\.lte\("claimed_at", new Date\(now - 5 \* 60 \* 1000\)/);
  assert.match(panel, /id="admin-stalled-print-jobs"/);
  assert.match(panel, /Pedido \{order \? `#\$\{order\.order_number\}`/);
  assert.match(panel, /Não saiu — recuperar/);
  assert.match(panel, /Saiu no papel/);
  assert.match(panel, /checked=\{recoveryAcknowledged\}/);
  assert.match(panel, /window\.confirm\(/);
  assert.match(panel, /recoverStalledPrintJob\(client, job\.id, action\)/);
  assert.match(panel, /Recuperar comanda travada/);
  assert.match(panel, /!recoveryAcknowledged \|\| Boolean\(recoveringPrintId\)/);
  assert.match(css, /\.admin-stalled-prints/);
});

test("contrato comercial e QZ continuam com token e sem replay autônomo de impressão travada", () => {
  assert.match(api, /client\.rpc\("admin_recover_stalled_print_job"/);
  assert.match(api, /p_acknowledgement: acknowledgement/);
  assert.match(qz, /await claimPrintJob\(client, getKitchenWorkerId\(\)\)/);
  assert.match(qz, /await completePrintJob\(client, claim\)/);
  assert.match(qz, /await failPrintJob\(client, claim, failure\)/);
  assert.ok(!qz.includes("admin_recover_stalled_print_job"));
  assert.ok(!qz.includes("admin_create_reprint"));
});
