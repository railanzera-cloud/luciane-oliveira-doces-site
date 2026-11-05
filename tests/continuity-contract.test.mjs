import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const docs=[
 'docs/continuidade/PROMPT-MESTRE-COMERCIAL.md',
 'docs/continuidade/MEMORIA-DE-DECISOES.md',
 'docs/continuidade/REFERENCIA-VISUAL-UX.md',
 'docs/continuidade/MATRIZ-DE-IMPACTO-COMERCIAL.md',
 'docs/continuidade/CHECKPOINT-VIVO.md'
];
const text=(file)=>readFileSync(join(root,file),'utf8');

test('continuidade comercial tem as cinco fontes duraveis e entrada oficial',()=>{
 for(const p of ['AGENTS.md','README.md','ESTADO_ATUAL_VITRINE.md',...docs]){
  assert.ok(existsSync(join(root,p)),`Arquivo de continuidade ausente: ${p}`);
 }
 for(const entry of ['AGENTS.md','README.md']){
  const s=text(entry);
  for(const p of docs)assert.ok(s.includes(p),`${entry} nao encaminha para ${p}`);
  const legacy=entry==='README.md'?'v10.7':'## Regras de engenharia';
  assert.ok(s.indexOf(docs[0])<s.indexOf(legacy),
    `${entry} deve apresentar o protocolo antes das secoes de historico ou regras`);
 }
 assert.ok(text('ESTADO_ATUAL_VITRINE.md').includes(docs[2]),
   'o checkpoint visual historico deve apontar a referencia atual');
});

test('memoria nao perde motivacao, alternativas e decisoes aprovadas',()=>{
 const s=text(docs[1]);
 for(let i=1;i<=14;i++){
  const id=`D-C${String(i).padStart(2,'0')}`;
  assert.ok(s.includes(id),`Decisao ${id} ausente`);
 }
 for(const p of ['Motivo','Rejeitado','WhatsApp','Trufadas','estoque','visual','cozinha'])
  assert.ok(s.toLowerCase().includes(p.toLowerCase()),`Contexto essencial ausente: ${p}`);
});

test('a matriz cobre produto e todas as etapas reais ate pedido e operacao',()=>{
 const s=text(docs[3]);
 for(const p of ['Catálogo','SKU','preço','estoque','carrinho','checkout','pedido',
                  'WhatsApp','pagamento','admin','cozinha','CRM','QZ','idempotente'])
  assert.ok(s.toLowerCase().includes(p.toLowerCase()),`Integracao sem cobertura: ${p}`);
 assert.ok(s.includes('Definição de pronto'), 'precisa da verificacao de produto ponta a ponta');
});

test('referencia visual protege aprovacao sem assumir homologacao de producao',()=>{
 const s=text(docs[2]);
 for(const p of ['Gourmet','Trufadas','Fatias','fotografias','Safari',
                 '320','390','antes/depois','aprovada visualmente']){
  assert.ok(s.toLowerCase().includes(p.toLowerCase()),`Falta criterio visual: ${p}`);
 }
});

test('checkpoint declara baseline real e distingue candidato, CI e deploy',()=>{
 const s=text(docs[4]),master=text(docs[0]);
 assert.match(s,/62f7780c6d6ede5dceea9eba19212e67cd20f77a/);
 assert.match(s,/26730be48be7f694ed92d9a23b0b8789bdbb7239/);
 assert.match(s,/41620045678/);
 assert.ok(s.includes('Não comprovado')||s.includes('não comprovado')||s.includes('não foi verificado'),
   'deployment real nao pode ser tratado como confirmado');
 assert.ok(master.includes('edqiwvccmboyayojvuea'));
 assert.ok(master.includes('cztafxixnfpliaygniuj'));
 assert.ok(master.includes('Não há categoria')||master.includes('A tarefa atual sempre'));
 assert.ok(s.includes('Próxima tarefa')||s.includes('próxima tarefa'));
});
