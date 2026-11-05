import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const docs=['PROMPT-MESTRE-COMERCIAL.md','MEMORIA-DE-DECISOES.md','CHECKPOINT-VIVO.md','REFERENCIA-VISUAL-UX.md','MATRIZ-IMPACTO-COMERCIAL.md'].map(n=>'docs/continuidade/'+n);
const read=p=>readFileSync(join(root,p),'utf8');
test('entrada permanente aponta para todas as referencias versionadas',()=>{
 for(const p of ['AGENTS.md','README.md',...docs]) assert(existsSync(join(root,p)),p+' ausente');
 for(const p of ['AGENTS.md','README.md']) for(const d of docs) assert(read(p).includes(d),p+' sem link '+d);
});
test('contratos e segregacao documentados',()=>{
 const p=read(docs[0]),m=read(docs[1]),c=read(docs[2]),matrix=read(docs[4]);
 for(const id of ['edqiwvccmboyayojvuea','cztafxixnfpliaygniuj']) assert(p.includes(id));
 for(let i=1;i<=14;i++) assert(m.includes('C-'+String(i).padStart(2,'0')),'decisao '+i);
 assert.match(c,/26730be48be7f694ed92d9a23b0b8789bdbb7239/);
 assert.match(c,/Produção|Produ\u00e7\u00e3o/);
 assert.match(matrix,/Novo produto/);
 assert.match(matrix,/cozinha\/QZ|cozinha/i);
});
