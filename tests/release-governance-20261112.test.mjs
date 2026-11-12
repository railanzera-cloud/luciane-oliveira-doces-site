import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const state = JSON.parse(readFileSync(join(root, "docs/continuidade/ESTADO-DE-RELEASE.json"), "utf8"));
const guide = readFileSync(join(root, "docs/continuidade/PROTOCOLO-DE-INTEGRACAO-E-RELEASE.md"), "utf8");
const agent = readFileSync(join(root, "AGENTS.md"), "utf8");
const checkpoint = readFileSync(join(root, "docs/continuidade/CHECKPOINT-VIVO.md"), "utf8");

const execute = (mode) => spawnSync(process.execPath, ["scripts/check-commercial-release.mjs", mode], {
  cwd: root, encoding: "utf8", env: { ...process.env, RELEASE_SOURCE_SHA: "" }
});

test("snapshot de versão tem uma referência íntegra, mas não fabrica produção", () => {
  assert.equal(state.schema_version, 1);
  assert.equal(state.repository, "railanzera-cloud/luciane-oliveira-doces-site");
  assert.equal(state.source_of_truth_policy.validated_code_reference_sha,
    "8df271026c11100afa726c9e4e276ee94d526f45");
  assert.equal(state.source_of_truth_policy.production_code_sha, null);
  assert.equal(state.deployments.cloudflare.verification_state, "unknown");
  assert.equal(state.deployments.cloudflare.latest_deployment_package_sha256, null);
  assert.equal(state.deployments.supabase_commercial.project_ref, "edqiwvccmboyayojvuea");
  assert.equal(state.deployments.supabase_commercial.observed_edge_version, 36);
  assert.equal(state.deployments.supabase_commercial.observed_new_cascao_supported_by_edge, false);
  assert.equal(state.release_readiness.status, "blocked");
  assert.equal(state.release_readiness.do_not_auto_deploy, true);
});

test("não confunde pacote CI, fotografias externas nem ZIP publicado", () => {
  const v44 = state.validated_artifacts.find(x => x.release === "V4.4");
  assert.ok(v44);
  assert.equal(v44.deployed, "not_verified");
  assert.equal(v44.files, 117);
  assert.equal(v44.contains_unversioned_approved_photos, true);
  assert.match(v44.sha256, /^[a-f0-9]{64}$/);
  assert.match(guide, /main/);
  assert.match(guide, /PR #34/);
  assert.match(guide, /refrigerantes/i);
  assert.match(guide, /não prova publicação|nem prova de deploy/i);
});

test("preflight documental passa sem declarar publicação", () => {
  const r=execute("--preflight");
  assert.equal(r.status,0, r.stderr);
  assert.match(r.stdout,/PREFLIGHT OK/);
  assert.match(r.stdout,/release=blocked/);
});

test("gate de release falha fechado com Edge e Cloudflare não verificados", () => {
  const r=execute("--release");
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/BLOCKED:/);
  assert.match(r.stderr,/Cloudflare deployment não verificado/);
  assert.match(r.stderr,/Paridade de preços\/SKUs do backend produtivo não comprovada/);
});

test("a entrada do projeto e o checkpoint direcionam para o protocolo novo", () => {
  assert.match(agent,/PROTOCOLO-DE-INTEGRACAO-E-RELEASE\.md/);
  assert.match(agent,/ESTADO-DE-RELEASE\.json/);
  assert.match(checkpoint,/work\/integracao-comercial-controlada-20261112/);
  assert.match(guide,/Safari\/Instagram/);
  assert.match(guide,/WhatsApp/);
});
