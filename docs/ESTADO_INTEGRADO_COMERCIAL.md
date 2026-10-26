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
- Ao testar sincronizacao com sinais reais do Tintim, foi detectado um nome de contato com 1 caractere (emoji). Foi preparado hotfix incremental crm_tintim_short_names_fix, que usa nome neutro "Contato WhatsApp" caso o nome seja insuficiente. Teste de sincronizacao completo com ROLLBACK: 43 contatos elegiveis importados na transacao; persistencia somente apos validar hotfix.
- Nenhum dado de clientes existente foi apagado. WABA, numero, Coexistence e verificacao Meta ainda dependem de confirmacao real.
- Foi preservada a alteracao concorrente do layout responsivo em app/globals.css e a branch nao foi rebobinada/forcada.
- A rota comercial ativa no Cloudflare continua nao vinculada com certeza a SHA de GitHub. Nenhum deploy Cloudflare realizado.
- Proximas validacoes: CI hotfix, aplicacao aditiva, permissao staff, Safari real, webhook real autenticado antes de qualquer envio comercial.
