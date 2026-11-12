#!/usr/bin/env node
/**
 * Commercial release state validator. Read-only; no external mutations.
 * --preflight: check that the snapshot is internally consistent.
 * --release: fail closed without verified Cloudflare, Edge and package identity.
 * Passing --release cannot replace live remote verification and authorization.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const log = (message) => process.stdout.write(message + "\n");
const fail = (message) => { process.stderr.write("BLOCKED: " + message + "\n"); process.exitCode = 1; };
const isSha = (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const argv = new Set(process.argv.slice(2));
if (argv.has("--help")) { log("Use --preflight or --release"); process.exit(0); }
if ([...argv].some(x => !["--preflight", "--release"].includes(x)) ||
    (argv.has("--preflight") && argv.has("--release"))) {
  fail("Use exclusivamente --preflight ou --release");
  process.exit(1);
}
const release = argv.has("--release");
const root = process.cwd();
const stateFile = resolve(root, "docs/continuidade/ESTADO-DE-RELEASE.json");
let state;
try { state = JSON.parse(readFileSync(stateFile, "utf8")); }
catch (error) { fail("Snapshot ausente/inválido: " + error.message); process.exit(1); }

const errors = [];
const check = (pass, message) => { if (!pass) errors.push(message); };
const policy = state.source_of_truth_policy || {};
const cloud = state.deployments?.cloudflare || {};
const backend = state.deployments?.supabase_commercial || {};
const gate = state.release_readiness || {};
const artifacts = state.validated_artifacts || [];

check(state.schema_version === 1, "Schema deve ser versão 1");
check(state.project === "commercial", "Este gate é apenas para o comercial");
check(state.repository === "railanzera-cloud/luciane-oliveira-doces-site", "Repositório não corresponde à loja");
check(policy.integration_candidate_branch?.startsWith("work/integracao-comercial-"), "Branch candidata não identificada");
check(isSha(policy.validated_code_reference_sha), "SHA do código candidato inválido");
check(policy.do_not_equate_main_with_production === true, "Main não é prova de produção");
check(cloud.site === "https://lucianeoliveiradoces.pages.dev", "Endereço Cloudflare inesperado");
check(["unknown", "verified"].includes(cloud.verification_state), "Estado Cloudflare inválido");
check(backend.project_ref === "edqiwvccmboyayojvuea", "Supabase comercial não identificado");
check(backend.edge_function === "create-whatsapp-order", "Função de pedidos inesperada");
check(Array.isArray(backend.observed_natal_price_centavos) &&
  backend.observed_natal_price_centavos.length === 4 &&
  backend.observed_natal_price_centavos.every(Number.isInteger), "Natal exige quatro preços observados");
check(Array.isArray(artifacts) && artifacts.length >= 1, "Nenhum artefato documentado");
for(const a of artifacts) {
  check(isHash(a.sha256), "Hash inválido no pacote " + a.filename);
  check(isSha(a.compiled_from_sha), "Origem do pacote inválida: " + a.filename);
  check(typeof a.filename === "string" && a.filename.endsWith(".zip"), "Pacote precisa ser ZIP");
  check(["verified","not_verified"].includes(a.deployed), "Publicação do pacote sem comprovação");
}
check(["blocked","ready"].includes(gate.status), "Estado de release inválido");
check(Array.isArray(gate.known_blockers), "Lista de bloqueios ausente");
check(gate.do_not_auto_deploy === true, "Deploy automático não autorizado");
check(gate.requires_explicit_release_authorization === true, "Autorização de publicação é obrigatória");
check(existsSync(resolve(root,"AGENTS.md")), "AGENTS.md não encontrado");
check(existsSync(resolve(root,"docs/continuidade/PROTOCOLO-DE-INTEGRACAO-E-RELEASE.md")), "Protocolo de integração ausente");
if (cloud.verification_state === "unknown") {
  check(cloud.latest_deployment_code_sha === null &&
    cloud.latest_deployment_package_sha256 === null &&
    policy.production_code_sha === null, "Sem deployment verificado, SHA de produção deve ser null");
}
if (gate.status === "blocked") check(gate.known_blockers.length > 0, "Gate bloqueado exige motivos");
if (gate.status === "ready") check(gate.known_blockers.length === 0, "Gate pronto não admite bloqueios");
if (errors.length) for(const message of errors) fail(message);
else log("PREFLIGHT OK: " + state.updated_date + " · reference=" +
         policy.validated_code_reference_sha.slice(0,12) + " · cloudflare=" +
         cloud.verification_state + " · release=" + gate.status);
if (release) {
  const unresolved = [];
  if (gate.status !== "ready") unresolved.push("Gate marcado como bloqueado");
  if (gate.known_blockers?.length) unresolved.push(gate.known_blockers.join("; "));
  if (cloud.verification_state !== "verified") unresolved.push("Cloudflare deployment não verificado");
  if (!isSha(cloud.latest_deployment_code_sha)) unresolved.push("SHA de frontend publicado desconhecido");
  if (!isHash(cloud.latest_deployment_package_sha256)) unresolved.push("Hash de ZIP publicado desconhecido");
  if (!isSha(policy.production_code_sha) || policy.production_code_sha !== cloud.latest_deployment_code_sha)
    unresolved.push("SHA de produção não coincide com Cloudflare");
  if (backend.production_contract_consistency !== "compatible_with_release" ||
      backend.observed_new_cascao_supported_by_edge !== true ||
      !Array.isArray(backend.observed_natal_price_centavos) ||
      !backend.observed_natal_price_centavos.every(x => x === 2200))
    unresolved.push("Paridade de preços/SKUs do backend produtivo não comprovada");
  if (!isSha(process.env.RELEASE_SOURCE_SHA) ||
      process.env.RELEASE_SOURCE_SHA !== policy.production_code_sha)
    unresolved.push("RELEASE_SOURCE_SHA explícito não corresponde à versão publicada");
  if (!artifacts.some(a => a.sha256 === cloud.latest_deployment_package_sha256 && a.deployed === "verified"))
    unresolved.push("Artefato publicado sem hash validado");
  if (unresolved.length) for (const message of unresolved) fail(message);
  else log("GATE DOCUMENTAL OK. Revalidar sistemas ao vivo e obter autorização operacional; nenhum deploy executado.");
}
