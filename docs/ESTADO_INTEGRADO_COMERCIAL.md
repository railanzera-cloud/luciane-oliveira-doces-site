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
