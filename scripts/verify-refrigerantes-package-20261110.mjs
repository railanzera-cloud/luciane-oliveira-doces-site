import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const zip=process.argv[2] ?? 'outputs/luciane-oliveira-doces-cloudflare-pages.zip';
const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).trim().split('\n');
assert.equal(names.length,new Set(names).size,'ZIP contém caminhos duplicados');
execFileSync('unzip',['-t',zip],{maxBuffer:16*1024*1024});
const bytes=name=>execFileSync('unzip',['-p',zip,name],{maxBuffer:16*1024*1024});
for(const path of ['index.html','admin/index.html','pedido/index.html','_worker.js','_routes.json','_headers'])assert.ok(names.includes(path),path);
const approved=JSON.parse(await readFile('docs/approved-assets-20261110.json','utf8'));
assert.equal(approved.length,58);
for(const image of approved)assert.equal(createHash('sha256').update(bytes(image.path)).digest('hex'),image.sha256,image.path);
for(const id of ['coca-zero-220','coca-original-350','fanta-220','guarana-200'])assert.ok(names.includes(`images/refrigerante-${id}-20261110.webp`));
for(const path of ['index.html','admin/index.html','pedido/index.html']){
 const html=bytes(path).toString('utf8');
 for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)/g))assert.ok(names.includes(m[1].slice(1)),m[1]);
}
const js=names.filter(n=>n.endsWith('.js')).map(n=>bytes(n).toString()).join('\n');
assert.ok(js.includes('edqiwvccmboyayojvuea.supabase.co'),'Conexão comercial ausente');
assert.ok(!js.includes('http://127.0.0.1:4173'),'QA local não pode entrar no pacote');
assert.ok(!js.includes('qa-local-only'));
console.log(JSON.stringify({entries:names.length,size:(await readFile(zip)).length,sha256:createHash('sha256').update(await readFile(zip)).digest('hex'),preservedImages:58,newDrinksImages:4,routes:['/','/admin','/pedido']},null,2));
