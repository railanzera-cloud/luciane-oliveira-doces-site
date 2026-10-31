# Follow-up assistido — homologação técnica — 31/10/2026

Luciane Oliveira Doces; repositório `railanzera-cloud/luciane-oliveira-doces-site`; Supabase `edqiwvccmboyayojvuea`; America/Belem. Sem envio automático, aplicação de migration, publicação ou merge main.

## Base integrada

Branch candidata: `work/followup-assistido-integrado-20261031`.

- Base CRM: `feature/crm-meta-status-webhook-20261027` @ `5402914135aa3500b0ecd119871d7b1c1dd519d4`.
- Linha comercial: `feature/pre-reserva-chocolate-morango-31102026` @ `c803cf95713dcc544318b7b23bf970e5bebec1ca`.
- Merge isolado: `0236752b8ff3d926c575c224acfd4625098d6a2a`, com ambos como pais. Único conflito em lista de branches CI, resolvido preservando ambas. `app/page.tsx` e `app/order-checkout.ts` são idênticos à linha de 31/10.

As branches intermediárias CRM de followups, triagem, compra, live sync, observação/diagnóstico/horários Tintim, preflight, menções, confirmação, fila, motor, mobile e outbox estão na ancestralidade da base CRM. Bifurcações históricas de agente Windows e MP HMAC continuam fora desta consolidação, conforme documentação anterior; não adotadas sem homologação.

Deployment ativo Cloudflare não foi vinculado a SHA. O ZIP anterior de pré-reserva de 31/10 não continha fotos Coco. As imagens aprovadas foram recuperadas do ZIP comercial de 24/10, sem transformação, e agora estão versionadas:

- `public/fatia-coco-cremoso-morango.webp`: SHA256 `e90e5c57ec46c3203093acaa95022be87ef7770fa3889c7a4200b69eeea9ee6e`.
- `public/fatia-coco-cremoso-morango-card.webp`: SHA256 `204e05f55cf50fce8fd30c3294cc400477e22a38c137b8d0738ef54ff46797ec`.

## Reaproveitamento e correções

Reaproveitados clientes, conversas, consentimento/evidência, opt-out, lembrete único de 45 min, sincronização/observação Tintim, cancelamento por resposta, preflight, confirmação independente de produto, mensagens, pesquisa e lista mobile.

O link antigo usava apenas o estado do cartão. Agora uma revisão autenticada atual do servidor devolve destinatário e produto; só depois a aba reservada navega para wa.me. Mudança de telefone, produto, lembrete, horário ou política bloqueia a navegação. Exige produto explicitamente salvo e conferência humana da conversa no WhatsApp Business. Rascunhos de anúncio/menção permanecem hipóteses, não autorização.

Registrar envio é separado de abrir WhatsApp. A nova RPC bloqueia cliente/conversa/lembrete durante a revalidação e confere os dados esperados. O endpoint legado também passa pelo novo gate; o core interno perde EXECUTE de authenticated/anon/PUBLIC. Um envio registrado para o mesmo telefone impede outro follow-up antes de nova entrada do cliente, inclusive quando o webhook observa a saída manual e cria outro lembrete.

UI acrescenta contador, destino/produto, confirmação da conversa, retorno de abertura e aba Finalizados. Esta aba usa a listagem existente (até 150 atendimentos), não um histórico ilimitado. Compra manual não cria pedido/faturamento. Conteúdo completo da conversa permanece no WhatsApp Business existente.

Erros PostgREST agora são legíveis. RPCs têm timeout 15 s; trava imediata protege cliques repetidos; refresh antigo não sobrescreve o recente. Falha de leitura bloqueia ações sobre dados desatualizados. Arquivos principais: painel TSX/CSS, `lib/crm-assisted.ts`, migration incremental, testes SQL/cliente, fixtures e runner QA, build guard, typecheck, dependência dev PGlite, documentação e fotos recuperadas.

## Banco: migration preparada, NÃO aplicada

`supabase/migrations/20261031175609_crm_assisted_followup_guard.sql`, criada pela CLI. Acrescenta `crm_assisted_followup_review`, `crm_assisted_record_send` e protege `crm_record_action`. Sem tabelas novas, alteração de RLS, pedidos, pagamentos, estoque, cron ou históricos. RPCs authenticated exigem staff; anon não tem EXECUTE.

A revisão manual remove SOMENTE `sender_disabled` do preflight: é o bloqueio do transporte automático, que continua false. Consentimento, opt-out, janela, timestamp original, estado e compra permanecem obrigatórios; motivos desconhecidos bloqueiam. Preflight automático continua ready=false.

Antes de aplicar: autorização específica, backup/snapshot das funções, comparação com definições atuais e migrations de produção. Aplicar somente esta migration após homologação, nunca reaplicar o diretório inteiro.

Rollback técnico preparado, não executado:

```sql
BEGIN;
DROP FUNCTION public.crm_record_action(uuid,text,text,integer,text);
DROP FUNCTION public.crm_assisted_record_send(uuid,text,text);
DROP FUNCTION public.crm_assisted_followup_review(uuid);
ALTER FUNCTION public.crm_record_action_core(uuid,text,text,integer,text) RENAME TO crm_record_action;
GRANT EXECUTE ON FUNCTION public.crm_record_action(uuid,text,text,integer,text) TO authenticated;
COMMIT;
```

Rollback remove as proteções novas e exige plano de frontend correspondente. Frontend novo diante de banco antigo falha fechado, sem liberar contatos.

## Evidências executadas

- Build produção vinext aprovado, configuração pública Supabase comercial, `SITE_ORDERING_ENABLED=false`.
- TypeScript aprovado; agora inclui explicitamente o painel CRM.
- Suíte completa após build: **651/651 aprovados**, zero falhas.
- Novos testes: **28/28**; 24 SQL e 4 cliente/UI. PostgreSQL embarcado PGlite executa SQL real do CRM, preflight, confirmação e ingestão Tintim. Auth e tabelas comerciais externas mínimas são fixtures; não equivale a Supabase Auth/PostgREST real nem prova concorrência entre conexões.
- SQL valida elegibilidade, ausência de consentimento/evidência, opt-out, produto, horário recebido versus original, janela/futuro, resposta, encerramento, possível compra Tintim, pedido pago, prazo, revisão sem gravação, registro único, destinatário divergente, endpoint antigo, índice único e ACL. Ingestão Tintim real cancela por resposta, deduplica retry e não libera novo contato após observar saída manual. Fixtures descartadas por ROLLBACK; zero testes gravados na produção.
- Chromium desktop com componente real e RPCs locais: destino wa.me correto, pending preservado ao abrir; registro posterior mudou para sent_manually, Para agora=0 e Finalizados=1. WhatsApp interceptado, sem rede/envio.
- Chromium com documento em iframe **390 × 844**: screenshot inspecionado; rascunho e ações legíveis. Exercitados produto ausente, salvar produto diferente do anúncio, possível compra, resposta antes e durante revisão, ausência de timestamp e abertura elegível. Não é Safari físico.
- Verificações textuais legadas foram ajustadas ao wrapper RPC com timeout e à navegação após preflight; novas verificações SQL exercitam os bloqueios reais.
- Rotas QA removidas antes do build; build recusa QA temporário. Reprodução: `node scripts/crm-assisted-qa.mjs`, preview local, `/crm-qa` ou `/crm-qa-mobile`; finalizar com `node scripts/crm-assisted-qa.mjs --clean` antes de compilar.

## Estado real e limites

Leitura agregada, sem gravação: funções preflight/ações/confirmação presentes; 56 pending; zero clientes com consentimento concedido sem opt-out; zero inbound Tintim com `provider_timestamp`; automatic_sends_enabled=false. Fotografia do momento, não estado permanente. Nenhum contato foi liberado artificialmente.

Pronto para homologação isolada: código integrado, UI assistida, migration incremental testada, build/regressões e pacote candidato. Ainda não pronto para operação comercial: requer autorização/aplicação da migration, homologação Auth/PostgREST, consentimento verdadeiro e horários originais confiáveis, comparação do deploy/configurações e Safari/WhatsApp Business físico. Não inventar evidência, não liberar os 56 em lote.

Tintim precisa fornecer metadados confiáveis; mídias podem não ser observadas. Meta/BSP/Coexistence e verificação empresarial continuam pendências de eventual transporte automático, fora do escopo. Nenhum token, reconexão, migração de número ou API outbound foi criado.

Checkout, pedidos, pagamentos, estoque, QZ, Pixel/CAPI e webhook Tintim não foram alterados por esta funcionalidade. Pré-reserva incorporada apenas como fonte, sem aplicar SQL em produção. Abrir WhatsApp não comprova envio, entrega ou pagamento; se o cliente responder após a abertura, a atendente precisa conferir novamente antes de enviar, pois o CRM não controla o aplicativo externo.

Próximo passo seguro: revisar SHA/pacote e homologar a migration no ambiente autorizado. Não publicar/aplicar sem autorização específica.
