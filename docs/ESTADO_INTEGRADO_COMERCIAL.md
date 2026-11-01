# CHECKPOINT FINAL DE HOMOLOGAÇÃO — TRUFADAS P/M/G — 01/11/2026

**Este checkpoint substitui quaisquer observações anteriores nesta página sobre o estado da expansão.**
**Não houve deploy, alteração do banco real ou merge em main.**

**Integração de branches concluída no código:** Trufadas + campanha expirável de
Últimas Fatias + reimpressão QZ segura (o código anterior dessas duas branches
foi incorporado por alterações pontuais, sem sobrescrever o checkout).

**Testes SQL concretos:** PostgreSQL 17 descartável via GitHub Actions
[Trufadas PMG CI](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/41326394689)
aprovou migration real, permissões, versão otimista, reserva por SKU, cancelamento,
pagamento único e corrida de dois pedidos sobre o mesmo saldo. Os dados eram
sintéticos, sem acesso a produção.

**Compatibilidade de rollback garantida em banco isolado:**
- `admin_get_crocante_inventory` legado permanece com exatamente 2 registros;
- `admin_set_crocante_inventory` legado preserva assinatura, guarda e resposta;
- Novo painel usa `admin_get_trufadas_pmg_inventory` e
  `admin_set_trufadas_pmg_inventory` com Auth staff e permissões explícitas;
- Public API lê os 11 estoques, mas site legado continua filtrando seus dois;
- Chocolate continua apenas no histórico; não apagar itens/pedidos/holds.

**Bloqueio único de publicação:** incorporar exatamente os CINCO arquivos WebP
abaixo, extraídos do ZIP de fotos aprovadas no chat, **na mesma branch**:
1. `public/images/pipocas-trufadas-ninho-20261101.webp` (206.852 bytes);
2. `public/images/pipocas-trufadas-pacoca-20261101.webp` (214.544 bytes);
3. `public/images/pipocas-trufadas-coco-queimado-20261101.webp` (201.814 bytes);
4. `public/fatia-coco-cremoso-morango.webp` (146.390 bytes, substituir existente);
5. `public/fatia-coco-cremoso-morango-card.webp` (146.390 bytes, substituir existente).
O teste `tests/trufadas-approved-assets-20261101.test.mjs` valida os SHA
de Git dessas cinco fotografias; não desativar o teste. A última CI completa
antes da guarda de hashes passou em 651/652 testes: único erro era a ausência
das fotografias. Versões existentes da fatia tinham outros hashes, portanto
não equivalem aos dois arquivos aprovados do ZIP.

**Ainda não feito:** backup completo e ATUAL do Supabase comercial, aplicação
da migração em produção, cadastro dos nove saldos reais, CI verde com fotos
exatas, ZIP Cloudflare do mesmo commit, revisão de Safari/iPhone e publicação.
A branch de DB Supabase exige autorização de custo adicional; usamos CI
isolada sem criar a branch cobrada. Nenhuma chamada para editar produção.

**Sequência de ativação sem regressão:** subir as cinco fotos na branch,
conferir CI TypeScript+testes+SQL, obter backup recuperável atual,
aplicar somente a migração homologada, verificar as duas RPCs antigas e as
novas, publicar ZIP da mesma SHA, cadastrar pacotes prontos P/M/G no painel,
executar pedido sintético de homologação sem cobrança/sem impressão indevida,
conferir Safari/iPhone/WhatsApp/QZ e liberar estoque físico confirmado.
Em rollback, reverter só o deploy e desativar os nove estoques no banco;
não eliminar registros históricos nem inventário com vendas.

---
# Expansão Trufadas P/M/G — 01/11/2026 — CHECKPOINT EM HOMOLOGAÇÃO

**NÃO PUBLICAR / NÃO MIGRAR PRODUÇÃO / NÃO MESCLAR NA MAIN.**

Branch de trabalho: `work/trufadas-variantes-pmg-20261101`, originada de
`work/homologacao-followup-assistido-20261031` em
`ad2e7e0de0b0ff6f44473368c355a9f2b3045b57`.
PR draft de revisão: https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/4
HEAD atual deve ser consultado no remoto antes de continuar.

IMPLEMENTADO NO CÓDIGO: catálogo de Trufadas Ninho, Paçoca e Coco Queimado
nos tamanhos P/M/G, preços em centavos no backend e frontend, nove chaves
de disponibilidade, carrinho conferindo o SKU exato, interface mobile,
painel com nove estoques individuais, preservação dos IDs antigos e
Chocolate retirado da seleção nova. Migration
`20261101160000_trufadas_pmg_nove_skus_20261101.sql`
preparada **não aplicada**, com estoque inicial zero/desativado.

IMPEDIMENTO VERIFICADO: os três WebP novos ainda NÃO estão commitados em
`public/images/`. O catálogo e a vitrine apontam para esses caminhos; a
suíte completa só falha no teste que exige fotografias aprovadas dentro
do checkout do repositório. Não retirar a proteção do teste.
As imagens aprovadas estão em um ZIP isolado de ativos
`LUCIANE-TRUFADAS-ATIVOS-APROVADOS-20261101.zip`
no artefato desta conversa; NÃO é pacote Cloudflare. Integrar os WebP
exatamente nos caminhos especificados, versionar e reexecutar CI.
A foto `fatia-coco-cremoso-morango.webp` tem referência de cartão
`fatia-coco-cremoso-morango-card.webp` agora explícita no catálogo.

RESULTADO CI: build e TypeScript OK nas execuções mais recentes. Última
falha funcional residual vista em `41323761750`: arquivo WebP aprovado
ausente do GitHub; demais testes funcionais executados passaram
nesse SHA. Novo HEAD deve repetir os testes após integração.
Não foram feitos testes reais em iPhone físico, QZ Tray, impressão, Pix,
Webhook ou transações de produção.

RISCOS AINDA ABERTOS: branches paralelas de Últimas Fatias
`feature/ultimas-fatias-refino-mobile-20261031` e diagnóstico QZ
`fix/cozinha-reimpressao-e-diagnostico-20261031` divergem da linha
CRM. Reconciliar diffs antes do ZIP final; não perder alterações
validadas. Exige homologação de concorrência da migração com PostgreSQL
isolado, com guarda dos nove SKUs, locks, baixa, cancelamento e estoque
recontado. Consultar deploy Cloudflare ativo por evidência antes de
publicar. Quantidade física de cada P/M/G depende da Luciane.
Gramagens M e G não confirmadas. "Cocada" 187 g informada no chat
não equivale automaticamente a "Coco Queimado" no catálogo.

---

# Homologação final do follow-up assistido — 31/10/2026

**Não aplicar a migration original isoladamente e não publicar ainda o ZIP.**

Branch filha `work/homologacao-followup-assistido-20261031`, originada de `f729cf5ab00633d6d564f101099ce8b76b364462`. Commit SQL/testes final: `e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b`; CI `41230661649` success, 50 verificações com PostgreSQL17.6, GoTrue2.197.0 e PostgREST16.5 reais. 29 funções reais comparadas integralmente, sem divergência. Frontend não mudou.

Foi reproduzido deadlock 40P01 na ordem de locks da guard original. Migration adicional `20261031183242_crm_assisted_activation_hardening.sql` padroniza cliente→conversa e preserva versões/autor de consentimento em auditoria privada. Ambas testadas apenas isoladamente. Rollback de corpo, ACL e dados aprovado.

Timestamp original continua ausente nos eventos observados e na forma atual documentada do message.create do Tintim; consentimentos reais registrados=0 na leitura. Cloudflare público: 3 HTMLs e 14 assets iguais ao ZIP anterior de pré-reserva; versão f729cf5 não está publicada na amostra. Deployment ID exato precisa ser capturado antes da ativação.

**Procedimento vigente:** `docs/FOLLOWUP-CHECKLIST-ATIVACAO-20261031.md`, com portões de ativação, hashes SQL/ZIP, pré/pós-checagem e rollback. Não reaplicar migrations antigas nem usar scripts/contas do runner na produção. Nenhuma mudança de produção, main, número/Coexistence ou envio foi realizada.

---

# Estado vigente — 31/10/2026 — follow-up assistido

Branch candidata integrada: `work/followup-assistido-integrado-20261031`.
Base CRM `5402914135aa3500b0ecd119871d7b1c1dd519d4` + linha comercial `c803cf95713dcc544318b7b23bf970e5bebec1ca`; merge `0236752b8ff3d926c575c224acfd4625098d6a2a`.
O checkpoint desta intervenção é o commit que introduz `docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md`; obter SHA com `git log -1 --format=%H -- docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md` e conferir HEAD remoto antes de continuar. Relatório de entrega e ZIP identificam o SHA final.

Build, TypeScript e 651 testes aprovados localmente. Fluxo assistido testado em Chromium desktop e documento 390 × 844 com fixtures. Migration `20261031175609_crm_assisted_followup_guard.sql` PREPARADA, NÃO aplicada. Sem envio real, Cloudflare ou main. Deployment ativo não associado a SHA. Fotos Coco aprovadas agora versionadas, recuperadas sem transformação.

**Não publicar nem aplicar migrations automaticamente.** Uso real depende de homologação SQL/Auth/PostgREST, consentimento e horários confiáveis. Leitura agregada encontrou 56 pending, zero consentimentos válidos e zero inbound Tintim com timestamp original; nada foi liberado. Preservar checkout, QZ, pagamentos, estoque, Meta/Tintim e pré-reserva. Ver relatório para alterações, testes, rollback e próximo passo.

---

# ESTADO INTEGRADO COMERCIAL — 26/10/2026

Projeto exclusivo: Luciane Oliveira Doces / railanzera-cloud/luciane-oliveira-doces-site.
Supabase comercial: edqiwvccmboyayojvuea. Fuso America/Belem.
Separar de Luciane Gestão cztafxixnfpliaygniuj, Boutique e painel da agencia.

## Linha-base
Origem auditada: ops/chocolate-morango-pre-reserva-pausada-20261026
HEAD origem: 22cb12358548ac8f17d6bb445d2508d605b214ce.
Ultima CI funcional anterior: fix/pre-reserva-aceite-impressao-20261025,
7b3407c484d48ac5aa066f52960747934ef304f6.
main em 26730be48be7f694ed92d9a23b0b8789bdbb7239, deliberadamente anterior.
Bifurcacoes de MP HMAC e agente Windows: nao integradas automaticamente.
Deployment Cloudflare e ZIP anteriormente publicados: **nao identificados por commit**.

## Intervencao CRM
Branch feature/crm-followups-assistidos-20261026.
Primeiro commit 596170323cf02c5fd8b3a15cb6d020f3046c2a8a.
Implementado: aba Clientes em /admin, CRM assistido, lista/abertura de leads Tintim,
contatos manuais, lembretes, consentimento, opt-out, eventos e mensagem por interesse.
Motor automatico Cloud API NAO esta ativo, WABA e numero nao homologados.
Migração aditiva crm_followups_assistidos_20261026 aplicada ao Supabase comercial.
5 tabelas CRM com RLS e 2 usuarios antigos da administracao na ACL.
Testes SQL ROLLBACK de elegibilidade e cancelamento aprovados; registros de teste eliminados.
Outros sistemas: pedidos, checkout, estoque, pagamentos, Meta, Tintim, cozinha intactos.

## Validacao do codigo
CI da primeira revisao: https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/40370760272
543 testes, typecheck, build, pacote e integridade ZIP aprovados.
Nova revisao documental/CI deve registrar seu proprio SHA e resultado apos push.
Nao afirmar Safari, QZ fisico nem WhatsApp real como homologados.

## Pendencias
- Homologacao visual do painel no Safari iPhone e notebook.
- Conferencia do deploy ativo antes de publicar pacote completo.
- Verificacao Meta empresarial e WABA/numero/Coexistence.
- Metadados confiaveis de recebimento/envio e depois envio oficial com protecoes.
- Venda fora do site continua necessitando confirmacao manual: no pedido real pode faltar telefone.
- Nao inferir consentimento ou produto apenas pelo nome de campanha.
- Nenhum envio em massa nem cron habilitado. Sem custo novo de SaaS.

## CRM — Observabilidade incremental (26/10, continuidade)
- Commit de codigo verificado: e1534329ff243979ccf085c59fcd95abc62d1622 (a revisao final posterior deve ser verificada no HEAD).
- CI https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/40373108909: 547/547 testes, TypeScript, build e ZIP aprovados.
- Migration crm_meta_observability_20261026 foi APLICADA ao Supabase comercial em 26/10. Implementa sincronizacao recente de leads, tabela de IDs de mensagem Meta, RPC autenticada e configuracao com automatic_sends_enabled=false.
- A Edge Function crm-whatsapp-webhook existe somente no repositorio; NAO foi publicada, nao existe credencial Meta enviada e nao houve mensagem automatica.
- Teste SQL com ROLLBACK: duas mensagens inbound, um echo outbound, uma repeticao duplicada; tres eventos unicos e zero lembretes pendentes apos resposta do cliente.
- Ao testar sincronizacao com sinais reais do Tintim, foi detectado um nome de contato com 1 caractere (emoji). Foi preparado hotfix incremental crm_tintim_short_names_fix, que usa nome neutro "Contato WhatsApp" caso o nome seja insuficiente. Hotfix aplicado na migration crm_tintim_short_names_fix_20261026; simulacao ROLLBACK validou 43 contatos. A sincronizacao inicial foi executada DEPOIS da correção: 81 contatos recentes avaliados, 43 contatos e 43 conversas importados no CRM, 38 ignorados. Todos permanecem sem consentimento confirmado, sem follow-up pendente e sem envio.
- Nenhum dado de clientes existente foi apagado. WABA, numero, Coexistence e verificacao Meta ainda dependem de confirmacao real.
- Foi preservada a alteracao concorrente do layout responsivo em app/globals.css e a branch nao foi rebobinada/forcada.
- A rota comercial ativa no Cloudflare continua nao vinculada com certeza a SHA de GitHub. Nenhum deploy Cloudflare realizado.
- Proximas validacoes: CI hotfix, aplicacao aditiva, permissao staff, Safari real, webhook real autenticado antes de qualquer envio comercial.

## Checkpoint de homologacao tecnica (26/10/2026)
- Codigo CRM incremental e hotfix de nomes em feature/crm-followups-assistidos-20261026; validar sempre o HEAD remoto antes de desenvolvimento.
- Ultima CI de codigo confirmada: https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/40373909474 com sucesso (build, TypeScript, testes, ZIP).
- Migrations aplicadas: crm_followups_assistidos_20261026, crm_meta_observability_20261026, crm_tintim_short_names_fix_20261026.
- Dados de CRM apos sincronizacao: 43 clientes, 43 atendimentos, 43 eventos de descoberta, 0 follow-ups agendados, 0 eventos Meta, 0 mensagens enviadas.
- RLS e permissoes de tabela verificadas; authenticated e anon sem SELECT direto nos dados privados do CRM. RPC observabilidade Meta apenas para service_role.
- automatic_sends_enabled=false, 45 minutos de configuracao inicial; nenhum cron nem envio real implementado.
- A Cloud API ainda depende de acesso a WABA, Phone Number ID, App Secret, token de verificacao, Coexistence e homologacao dos eventos reais.
- Sem deploy no Cloudflare, sem alteracoes em main ou em outros projetos.
- A CI nao substitui teste real no Safari nem prova de que os webhooks oficiais estao disponiveis.
