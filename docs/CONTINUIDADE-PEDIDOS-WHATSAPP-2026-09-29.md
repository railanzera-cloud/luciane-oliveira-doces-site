# Continuidade — pedidos pelo WhatsApp — 29/09/2026

## Estado

Implementação local sobre `c035c18bc134beafc76b078bf8d17114cc0f16c5`, sem recriação do projeto. Checkpoint de preservação: `58d99d1bda9fbc9b57313cd2f53a07ace2c9992e`. Nenhuma migration remota, publicação de Function ou publicação Cloudflare foi executada nesta rodada. O site comercial atual não foi substituído.

O fluxo comercial permanece WhatsApp e pagamento manual. Criar solicitação não é venda; abrir WhatsApp não comprova envio da mensagem. O estado inicial é aguardando confirmação da loja. Mercado Pago/SignatureMismatch, CAPI financeira, CRM, follow-ups e impressão automática permanecem fora do escopo.

## Implementado

- Nome obrigatório sem conta, observações opcionais de até 500 caracteres e preservação dos dados no navegador.
- Registro em `orders`, sequência real `order_number` preservada, LOD técnico mantido, token individual seguro. Validação de catálogo, totais, entrega, disponibilidade e abertura no servidor. Chave aleatória e hash do pedido protegem recuperação idempotente, inclusive após fechamento da loja; clique duplo e requisições simultâneas cobertos por testes.
- Mensagem compacta aprovada: número humano, nome, produtos/adicionais, recebimento, total, Pix atual ou pagamento presencial, observações e link individual. Entrega mostra endereço/taxa; dinheiro mantém troco.
- Tela de solicitação registrada, envio explícito pelo WhatsApp, cópia de Pix/link e recuperação do último acompanhamento. A saudação usa o primeiro nome; registro e mensagem guardam o nome completo.
- Painel existente: busca pelo número, indicadores com limite da consulta indicado, aceite/cancelamento, preparo, retirada/entrega e conclusão. Pagamento manual separado do operacional; sem Purchase ou impressão por pedidos WhatsApp.
- `/pedido`: token obrigatório para consulta, itens/total/status/pagamento/última atualização; atualização automática por polling existente de 5 segundos, foco e botão manual. Sem acesso anônimo direto às tabelas privadas.
- Primeira origem conhecida, visita atual e parâmetros disponíveis registrados, incluindo desconhecidos/repetidos. Não se atribui campanha não recebida.
- Prazo configurado preservado, com início após confirmação da loja. Orientação de maquininha e estrutura tipada para débito/crédito/parcelas, sem percentuais inventados. Tabela de taxas continua nula; eventual taxa futura exige cotação coerente no servidor e na confirmação antes de ativar cobrança.

## Tintim

O script público `tintim-1.0.js` foi inspecionado: ele captura parâmetros em cookies `tt_*` e adiciona parâmetros a links existentes na inicialização. O novo link surge depois; por isso recebe explicitamente parâmetros e cookies, sem substituir parâmetros já recebidos e preservando repetições. A mensagem humana é formatada antes da navegação. Nenhum sufixo invisível produzido pelo serviço Tintim foi removido, normalizado ou reposicionado. O código do redirecionamento proprietário e sua codificação invisível não foram disponibilizados; a atribuição ponta a ponta continua sendo uma verificação real de ativação. Tintim conserva a responsabilidade por compras fechadas no WhatsApp.

## Validação e limites

- Suíte existente, ajustada ao novo fluxo: **190/190 testes aprovados** em 29/09.
- Integração local com PostgreSQL/PGlite e execução do handler real com adaptador local: **10/10 aprovados**. Inclui nome, notas, retirada/entrega, Pix/cartão/dinheiro/troco, sequência, persistência, valores manipulados, indisponibilidade/fechamento, concorrência/idempotência, token/permissões, confirmação manual, estados/cancelamento e ausência de efeitos Purchase/impressão. Nenhum banco remoto foi usado.
- Build comercial e empacotamento de produção aprovados; `git diff --check` aprovado.
- Typecheck geral tem erros preexistentes de tipos Cloudflare em `db/index.ts` e `worker/index.ts`; não foram ampliados para esta rodada.
- Teste de navegador `tests/manual-orders.browser.mjs` preparado para três fluxos mobile, com serviços externos simulados. **Não está homologado:** uma execução anterior parou por divergência no texto da saudação (corrigida); nesta retomada o Chromium termina com SIGSEGV antes de abrir a página. WebKit depende de bibliotecas indisponíveis neste ambiente. Portanto não declarar responsividade/Safari, recuperação após navegação bloqueada ou fluxo mobile completos como aprovados em navegador.
- Antes da ativação comercial, executar o teste em ambiente com navegador funcional e conferir iPhone/Safari real, cópia de links, retorno do WhatsApp, duplicidade por recarga e atribuição real Tintim. Não há envio automático de mensagens nem leitura de conversas.

Comandos locais de referência (dependências de validação separadas do projeto):

```sh
node --test tests/*.test.mjs
PGLITE_MODULE=/caminho/@electric-sql/pglite/dist/index.js node --test tests/manual-orders.integration.mjs
npm run package:cloudflare:production
```

Para o teste mobile, servir `outputs/cloudflare-pages` na porta 4173 e executar `tests/manual-orders.browser.mjs`, informando `PLAYWRIGHT_MODULE`, `CHROMIUM_MODULE` e, se necessário, `CHROMIUM_EXECUTABLE`. Servidor e teste devem compartilhar o mesmo ambiente de rede. Não usar Supabase real: o teste intercepta serviços externos.

## Arquivos da implementação

- Checkout/rastreamento: `app/page.tsx`, `app/order-checkout.ts`, `app/globals.css`, `lib/site-order.ts`, `lib/manual-payment-policy.ts`.
- Finalização/acompanhamento: `components/whatsapp-order-result.tsx`, `app/pedido/page.tsx`.
- Administração: `components/admin-orders-panel.tsx`, `lib/admin-orders-client.ts`.
- Backend: `supabase/functions/create-whatsapp-order/index.ts`, `supabase/functions/public-order-status/index.ts`, `supabase/config.toml`.
- Migrations novas, nesta ordem: `20260928210000_manual_pix_method.sql`, `20260928210100_whatsapp_orders.sql`.
- Testes: `tests/manual-orders.integration.mjs`, `tests/manual-orders.browser.mjs`, `tests/checkout-tracking-message.test.mjs`, `tests/menu-refinement.test.mjs`, `tests/supabase-availability.test.mjs`.
- A Function nova reutiliza `supabase/functions/_shared/commerce-catalog.mjs`, incluído no pacote de backend sem mudança comercial.

## Sequência segura de ativação — exige autorização específica

1. Concluir a homologação mobile local. Preservar o ZIP comercial atualmente publicado e o estado anterior das Functions; confirmar backup do banco.
2. Conferir histórico de migrations do ambiente alvo. Aplicar **somente as duas novas migrations, em ordem**, com commit da alteração de enum antes da migration seguinte. Não reaplicar migrations antigas, não reiniciar sequência, não executar reset.
3. Publicar somente `create-whatsapp-order` e a atualização de `public-order-status`, com dependência `_shared`. A configuração `verify_jwt = false` segue a validação de chave pública/origem do código; não remover as verificações. Usar segredos existentes, sem expô-los ou alterar credenciais. Não publicar Functions financeiras.
4. Em ambiente de validação autorizado, testar solicitação controlada, número/token, duplicidade, aceite/cancelamento, conferência manual do pagamento, atualização pública e ausência de Purchase. Conferir o domínio permitido já configurado; qualquer alteração de configuração requer autorização. Confirmar o fluxo real Tintim e Safari.
5. Somente com backend validado, carregar manualmente o ZIP comercial novo no Cloudflare. Manter `SITE_ORDERING_ENABLED=false`. Não publicar o frontend antecipadamente: ele depende da nova Function/migrations.
6. Em caso de problema de frontend, restaurar o ZIP comercial anterior. Preservar pedidos criados e migrations aditivas; não executar rollback destrutivo automático no banco.

Taxas comerciais definitivas, produtos de quinta-feira, CRM e homologação do Mercado Pago continuam para outras etapas.
