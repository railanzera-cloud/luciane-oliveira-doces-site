// Pacote V4.7.15.9: Bombom de Uva R$22, preservando visual aprovado e demais preços.
// Build conectado com chave pública real, sem credenciais administrativas.
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {cp,mkdir,readFile,readdir,rm,writeFile} from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const from=path.join(root,"outputs","crm-commercial-core-NOT-PUBLISH");
const target=path.join(root,"outputs","fatias-refinamento-v47159");
const output=path.join(root,"outputs","LUCIANE_DOCES_V4_7_15_9_BOMBOM_UVA_R22_CLOUDFLARE.zip");
const sha=b=>createHash("sha256").update(b).digest("hex");
const publicKey=(process.env.SUPABASE_PUBLISHABLE_KEY||"").trim();
const projectUrl=(process.env.SUPABASE_URL||"").trim();
if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey))throw Error("Falta chave PUBLICA real do Supabase (sem mocks).");
if(projectUrl!=="https://edqiwvccmboyayojvuea.supabase.co")throw Error("URL comercial incorreta.");
if(process.env.SITE_ORDERING_ENABLED!=="false")throw Error("Flag do site diferente da base validada.");
const source=await readFile(path.join(root,"app/catalog.ts"),"utf8");
const backend=await readFile(path.join(root,"supabase/functions/_shared/commerce-catalog.mjs"),"utf8");
// Contrato crítico de preço: exatamente uma fatia Geleia Morango com Ninho a R$22.
const section = source.slice(source.indexOf('id: "fatia-coco-cremoso-morango"'), source.indexOf('id: "fatia-chocolate-cenoura"'));
if (!/name: "Geleia de Morango com Ninho"/.test(section) || !/price: 22, available: true/.test(section)) throw Error("Preco da fatia no site diverge de R$22.");
if (!backend.includes('"fatia-coco-cremoso-morango": Object.freeze({ id: "fatia-coco-cremoso-morango", itemKey: "slice_coco_cremoso_morango", name: "Geleia de Morango com Ninho", priceCents: 2200 })')) throw Error("Preco autoritativo diverge de R$22.");
for(const [file,body,patterns] of [
  ["app/catalog.ts",source,[/id: "ovomaltine"[^\n]+pricingGroup: 2/,/id: "choco-cookies-leite"[^\n]+pricingGroup: 1/]],
  ["commerce-catalog.mjs",backend,[/ovomaltine: Object.freeze\([^\n]+pricingGroup: 2/,/"choco-cookies-leite": Object.freeze\([^\n]+pricingGroup: 1/]],
])for(const pattern of patterns)if(!pattern.test(body))throw Error("Divergência de faixas em "+file+" "+pattern);

const baseSource = "021ee3d5d26d0734319a7fd66c5285595a7ebcf1";
const approvedSource = "f0ed9bf966ce96a5a63ca7cc9832f7a4ee68a4e5";
const protectedPaths = ["public", "app/menu-availability.ts", "app/order-checkout.ts", "lib/site-order.ts", "supabase", ":(exclude)supabase/functions/_shared/commerce-catalog.mjs"];
const protectedDiff = execFileSync("git", ["diff", "--name-only", baseSource, "HEAD", "--", ...protectedPaths], {encoding:"utf8"}).trim();
if (protectedDiff) throw Error("Mudança fora do refinamento aprovado: " + protectedDiff);

const oldAbacaxiName = "Abacaxi com Brigadeiro Branco";
const newAbacaxiName = "Abacaxi com Coco Queimado";
const baseFront = execFileSync("git", ["show", baseSource + ":app/catalog.ts"], {encoding:"utf8"});
const oldBombomFront = 'name: "Bombom de Uva",\\n    image: "/fatia-bombom-uva.avif",\\n    cardImage: "/fatia-bombom-uva.avif",\\n    imageAlt: "Fatia artesanal de bolo de chocolate com creme e uvas verdes",\\n    available: true,\\n    variants: [{ id: "fatia", label: "1 fatia", whatsappLabel: "1 fatia", price: 20, available: true }]';
const newBombomFront = oldBombomFront.replace('price: 20, available: true','price: 22, available: true');
const oldBombomBackend = '"fatia-bombom-uva": Object.freeze({ id: "fatia-bombom-uva", itemKey: "slice_bombom_uva", name: "Bombom de Uva", priceCents: 2000 })';
const newBombomBackend = oldBombomBackend.replace('priceCents: 2000','priceCents: 2200');
if (!baseFront.includes(oldBombomFront.replaceAll('\\n','\n'))) throw Error("Baseline frontend Bombom divergiu");
const baseBackend = execFileSync("git", ["show", baseSource + ":supabase/functions/_shared/commerce-catalog.mjs"], {encoding:"utf8"});
if (!baseBackend.includes(oldBombomBackend)) throw Error("Baseline backend Bombom divergiu");
const expectedFront = baseFront.replaceAll(oldAbacaxiName, newAbacaxiName)
 .replace('imageAlt: "Fatia artesanal de massa clara com pedaços de abacaxi e brigadeiro branco"', 'imageAlt: "Fatia artesanal de abacaxi"')
 .replace(oldBombomFront.replaceAll('\\n','\n'), newBombomFront.replaceAll('\\n','\n'));
const expectedBackend = baseBackend.replaceAll(oldAbacaxiName,newAbacaxiName).replace(oldBombomBackend,newBombomBackend);
if (!source.includes(newBombomFront.replaceAll('\\n','\n')) || !backend.includes(newBombomBackend))
 throw Error("Fatia Bombom de Uva nao esta R$22 no cliente e backend.");
if (source !== expectedFront || backend !== expectedBackend) throw Error("O catálogo divergiu do nome aprovado de Abacaxi e do preco autorizado R$22 para Bombom de Uva.");

const visualDiff = execFileSync("git", ["diff", "--name-only", approvedSource, "HEAD", "--", "app/page.tsx", "app/layout.tsx", "app/fatias-refinamento-20261121.css", "lib/storefront-merchandising.mjs"], {encoding:"utf8"}).trim();
if (visualDiff) throw Error("O visual mudou depois da aprovação: " + visualDiff);

await rm(target,{recursive:true,force:true});await rm(output,{force:true});
await mkdir(target,{recursive:true});await cp(from,target,{recursive:true});
const found=[];
async function list(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);
if(f.isDirectory())await list(p);
else if(f.isFile())found.push(path.relative(target,p).replace(/\\/g,"/"));
else throw Error("Entrada inesperada: "+p);
}}
await list(target);
const names=new Set(found);
const required=[
  "index.html","404.html","admin/index.html","pedido/index.html",
  "informacoes-da-empresa/index.html","politica-de-privacidade/index.html",
  "termos-de-uso/index.html","exclusao-de-dados/index.html",
  "_worker.js","_routes.json","_headers",".vite/manifest.json",
  "pipoca-gourmet.jpeg",
  "images/cascao-ferrero-inteiro-card-20261114-v47143.webp",
  "images/cascao-kinder-inteiro-card-20261114-v47143.webp",
  "images/cascao-ninho-morango-inteiro-card-20261114-v47143.webp",
  "images/cascao-ninho-nutella-chocottone-inteiro-card-20261114-v47143.webp",
  "images/cascao-prestigio-inteiro-card-20261114-v47143.webp"
];
for(const file of required)if(!names.has(file))throw Error("Falta rota ou foto aprovada: "+file);
const viteManifest=JSON.parse(await readFile(path.join(target,".vite/manifest.json"),"utf8"));
if(!viteManifest["app/page.tsx"]?.file)throw Error("Manifest sem a vitrine");
const refs=new Set();
for(const value of Object.values(viteManifest))for(const f of [value.file,...(value.css||[]),...(value.assets||[])])if(f)refs.add(f);
for(const f of found){
 if(/\.js$/.test(f))execFileSync(process.execPath,["--check",path.join(target,f)],{stdio:"pipe"});
 if(!/\.(?:js|html|css)$/.test(f))continue;
 const body=await readFile(path.join(target,f),"utf8");
 if(/mock_no_production_credentials|sb_publishable_qa_mock/.test(body))throw Error("Mock detectado em "+f);
 for(const m of body.matchAll(/["'\x60]((?:\/|assets\/|\.\/)[^"'\x60\s?]+\.(?:js|css|webp|avif|jpe?g|png|svg|woff2?))["'\x60]/g)){
   const ref=m[1];
   refs.add(ref.startsWith("./")?path.posix.normalize(path.posix.join(path.posix.dirname(f),ref)):ref.replace(/^\//,""));
 }
}
for(const ref of refs)if(!names.has(ref))throw Error("Asset ausente do pacote: "+ref);
const jsFiles=found.filter(x=>x.endsWith(".js"));
const jsContent=(await Promise.all(jsFiles.map(x=>readFile(path.join(target,x),"utf8")))).join("\n");
if(!jsContent.includes(projectUrl)||!jsContent.includes(publicKey))throw Error("Build nao esta conectado ao Supabase comercial.");
if(!jsContent.includes("ovomaltine")||!jsContent.includes("choco-cookies-leite"))throw Error("Os sabores nao constam nos chunks de cliente.");

const mediaFiles = found.filter(f => /\.(?:webp|avif|jpe?g|png|svg|woff2?)$/.test(f));
if (mediaFiles.length !== 84) throw Error("Quantidade de mídias difere da base V4.7.15.6: " + mediaFiles.length);
for (const file of mediaFiles) {
 const original = execFileSync("git", ["show", baseSource + ":public/" + file], {maxBuffer:32*1024*1024});
 const packaged = await readFile(path.join(target, file));
 if (sha(original) !== sha(packaged)) throw Error("Mídia aprovada alterada: " + file);
}
for (const expected of ["connect.facebook.net/en_US/fbevents.js", "s.tintim.app/static/core/tintim-1.0.js"]) {
 if (!(await readFile(path.join(target,"index.html"),"utf8")).includes(expected)) throw Error("Mensuração ausente do HTML: " + expected);
}

const release={
  release:"V4.7.15.9-bombom-uva-r22",
  purpose:"Bombom de Uva R$22; preservar visual aprovado, Abacaxi com Coco Queimado, demais preços e mídias",
  source_branch:"fix/fatia-bombom-uva-r22-20261122",
  source_sha:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),
  checkout_base:"refine/checkout-clareza-carrinho-20261116",
  backend_required_catalog_version:"2026-11-18.gourmet-ovomaltine-cookies-leite",
  backend_reconciliation_required:true,
  backend_changes_required:true,
  visual_approval_date:"2026-11-21",
  approved_code_sha:"f0ed9bf966ce96a5a63ca7cc9832f7a4ee68a4e5",
  media_reference_sha:"021ee3d5d26d0734319a7fd66c5285595a7ebcf1",
  production_deployment_id:null,
  published:false,
  media_count:found.filter(x=>/\.(?:webp|avif|jpe?g|png|svg|woff2?)$/.test(x)).length,
  referenced_assets_checked:refs.size,
  files:[]
};
for(const f of found.sort()){
 const b=await readFile(path.join(target,f));
 release.files.push({path:f,bytes:b.length,sha256:sha(b)});
}
await writeFile(path.join(target,"RELEASE-MANIFEST.json"),JSON.stringify(release,null,2)+"\n");
execFileSync("zip",["-q","-r",output,"."],{cwd:target});
execFileSync("python3",["-c",
 "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert len(z.namelist())==len(set(z.namelist()))",
 output]);
console.log(JSON.stringify({archive:output,sha256:sha(await readFile(output)),files:release.files.length+1,media_count:release.media_count,refs:refs.size,source_sha:release.source_sha,needs_backend:true},null,2));
