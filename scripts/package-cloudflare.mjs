import { execFile } from "node:child_process";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv } from "vite";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputsRoot = path.join(projectRoot, "outputs");
const packageDirectory = path.join(outputsRoot, "cloudflare-pages");
const zipPath = path.join(outputsRoot, "luciane-oliveira-doces-cloudflare-pages.zip");
const clientDirectory = path.join(projectRoot, "dist", "client");
const workerPath = path.join(projectRoot, "dist", "server", "index.js");
const requireSupabase = process.argv.includes("--require-supabase");
const buildEnvironment = loadEnv("production", projectRoot, "");

const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
if (manifest.name !== "luciane-oliveira-doces") {
  throw new Error("Empacotamento interrompido: diretório do projeto não reconhecido.");
}

const hasSupabaseEnvironment = Boolean(
  (process.env.SUPABASE_URL ?? buildEnvironment.SUPABASE_URL)?.trim()
    && (process.env.SUPABASE_PUBLISHABLE_KEY ?? buildEnvironment.SUPABASE_PUBLISHABLE_KEY)?.trim(),
);
const siteOrderingEnabled = (process.env.SITE_ORDERING_ENABLED ?? buildEnvironment.SITE_ORDERING_ENABLED) === "true";
const hasMercadoPagoPublicKey = Boolean(
  (process.env.MP_PUBLIC_KEY_TEST ?? buildEnvironment.MP_PUBLIC_KEY_TEST)?.trim(),
);
if (requireSupabase && !hasSupabaseEnvironment) {
  throw new Error("SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY são obrigatórias para o ZIP de produção.");
}
if (!hasSupabaseEnvironment) {
  console.warn("Aviso: ZIP gerado em modo de fallback, sem conexão Supabase configurada.");
}
if (requireSupabase && siteOrderingEnabled && !hasMercadoPagoPublicKey) {
  throw new Error("MP_PUBLIC_KEY_TEST é obrigatória quando SITE_ORDERING_ENABLED=true.");
}

await access(clientDirectory);
await access(workerPath);
await rm(packageDirectory, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(packageDirectory, { recursive: true });
await cp(clientDirectory, packageDirectory, { recursive: true });

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("package", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const workerEnvironment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};
const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

async function renderRoute(route, targetFile) {
  const response = await worker.fetch(
    new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }),
    workerEnvironment,
    executionContext,
  );
  if (route !== "/404" && !response.ok) {
    throw new Error(`Falha ao renderizar ${route}: HTTP ${response.status}`);
  }
  const html = await response.text();
  if (!/^<!doctype html>/i.test(html.trim())) {
    throw new Error(`A rota ${route} não retornou um documento HTML completo.`);
  }
  const destination = path.join(packageDirectory, targetFile);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, "utf8");
  return html;
}

const homeHtml = await renderRoute("/", "index.html");
await renderRoute("/admin", "admin/index.html");
await renderRoute("/pedido", "pedido/index.html");
await writeFile(path.join(packageDirectory, "404.html"), homeHtml, "utf8");

await writeFile(
  path.join(packageDirectory, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
  "utf8",
);

await execFileAsync("zip", ["-q", "-r", zipPath, "."], { cwd: packageDirectory });

const requiredFiles = [
  "index.html",
  "admin/index.html",
  "pedido/index.html",
  "404.html",
  "pipoca-gourmet.jpeg",
  "fatia-prestigio-card.webp",
  "fatia-chocolatudo-card-518c74f4.webp",
  "fatia-chocolate-cenoura-card-6de0c35d.webp",
];
for (const requiredFile of requiredFiles) {
  await access(path.join(packageDirectory, requiredFile));
}

console.log(zipPath);
