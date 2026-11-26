// Candidate build core only. NEVER upload the resulting archive to Cloudflare.
// It omits binary assets previously shipped via manually assembled ZIPs.
// Merge with verified media from the approved release before publishing.
import {execFile} from "node:child_process";
import {access,cp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import path from "node:path";
import {promisify} from "node:util";
import {fileURLToPath,pathToFileURL} from "node:url";
import {catalogEntryFiles,shortLinks} from "../cloudflare/short-links.js";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const client = path.join(root,"dist","client");
const server = path.join(root,"dist","server","index.js");
const destination = path.join(root,"outputs","crm-commercial-core-NOT-PUBLISH");
const archive = path.join(root,"outputs","crm-commercial-core-NOT-PUBLISH.zip");
const envUrl=(process.env.SUPABASE_URL??"").trim();
const publicKey=(process.env.SUPABASE_PUBLISHABLE_KEY??"").trim();
if (!envUrl.startsWith("https://") || !publicKey.startsWith("sb_publishable_")) {
  throw new Error("CRM core requires the commercial Supabase URL and public publishable key.");
}
if (process.env.SITE_ORDERING_ENABLED !== "false") {
  throw new Error("Mode must match the verified legacy WhatsApp site before candidate bundling.");
}
await access(client);
await access(server);
await rm(destination,{recursive:true,force:true});
await rm(archive,{force:true});
await mkdir(destination,{recursive:true});
await cp(client,destination,{recursive:true});

const url=pathToFileURL(server);
url.searchParams.set("crm_core",String(Date.now()));
const {default:worker}=await import(url.href);
const scope={waitUntil(){},passThroughOnException(){}};
const env={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};

async function route(routeName,target) {
  const result=await worker.fetch(new Request("http://localhost"+routeName,{
    headers:{accept:"text/html"}}),env,scope);
  if (!result.ok) throw new Error("Render "+routeName+" returned "+result.status);
  const html=await result.text();
  if (!/^<!doctype html>/i.test(html.trim())) throw new Error("HTML missing "+routeName);
  const out=path.join(destination,target);
  await mkdir(path.dirname(out),{recursive:true});
  await writeFile(out,html,"utf8");
  return html;
}
const home=await route("/","index.html");
for(const [category,file] of Object.entries(catalogEntryFiles)) await route(`/?categoria=${category}`,file);
for(const [routeName,target] of [
 ["/admin","admin/index.html"],
 ["/pedido","pedido/index.html"],
 ["/informacoes-da-empresa","informacoes-da-empresa/index.html"],
 ["/politica-de-privacidade","politica-de-privacidade/index.html"],
 ["/termos-de-uso","termos-de-uso/index.html"],
 ["/exclusao-de-dados","exclusao-de-dados/index.html"],
])await route(routeName,target);
await writeFile(path.join(destination,"404.html"),home,"utf8");
await cp(path.join(root,"cloudflare","short-links.js"),path.join(destination,"_worker.js"));
await writeFile(path.join(destination,"_routes.json"),JSON.stringify({
  version:1,include:["/",...Object.keys(shortLinks)],exclude:[],
},null,2)+"\n");
await writeFile(path.join(destination,"_headers"),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/responsivas/*
  Cache-Control: public, max-age=31536000, immutable
`);

const required=["index.html","admin/index.html","pedido/index.html",
 "politica-de-privacidade/index.html","termos-de-uso/index.html",
 "exclusao-de-dados/index.html","_worker.js","_headers","_routes.json",...Object.values(catalogEntryFiles)];
for(const item of required) await access(path.join(destination,item));
const adminPage=await readFile(path.join(destination,"admin/index.html"),"utf8");
if (!adminPage.includes("assets/")) throw new Error("Admin HTML has no compiled assets.");
await exec("zip",["-q","-r",archive,"."],{cwd:destination});
console.log("CANDIDATE SOURCE CORE ONLY - NOT PUBLISHABLE",archive);
