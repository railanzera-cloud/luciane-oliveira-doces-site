# Refinamento de atribuição — etapa 3 (12/10/2026)

## Status
- Branch isolada a partir de `main`: `feature/tintim-tracking-bridge-20261012`.
- Não publicado no Cloudflare; não sincroniza automaticamente com o checkpoint Work `126b5a41` da promoção.
- Mudanças no código: `app/attribution-history.ts`, `app/order-checkout.ts`, `app/page.tsx`, `components/admin-orders-panel.tsx`.
- Testes novos: `tests/attribution-history.test.mjs` (8 casos do módulo exercitados em Node 22 + TypeScript verificado isoladamente no ambiente de preparação).
- Checkout continua enviando `attribution_snapshot` (jsonb) ao backend existente. Não exige migração de orders; só será populado em pedidos futuros após a publicação do frontend.
- `Purchase` segue exclusivamente pelos gatilhos do Tintim após confirmação de pagamento.

## Semântica
- `first_touch` e `current_visit` permanecem (compatibilidade).
- `marketing_interactions` é uma lista limitada de até 20 observações de parâmetros de URL, com `observed_at`, campanha, origem e ID do anúncio quando derivável.
- Um acesso à URL com parâmetro UTM sozinho NÃO é prova de clique pago nem causalidade.
- Captura de nova entrada apenas na inicialização da página. Abrir checkout na mesma página não cria nova interação.
- Acesso direto sem parâmetros preserva histórico. Retorno pelo link da bio é tratado separadamente; não reclassifica o anúncio anterior como clique atual.
- A lista guarda caminho, parâmetros conhecidos e indicador de fbclid; não armazena token de pedido, nome ou email.
- O painel de pedidos mostra histórico em bloco expansível, sem atribuir vendas automaticamente.

## Diagnóstico de vínculo automático
- No ambiente publicado havia 221 pedidos, apenas 4 com telefone válido: phone matching não funciona para a maioria.
- O número de pedido é transmitido no texto de handoff ao WhatsApp, mas webhook de mensagens permanece DESLIGADO. Não inferir correspondência por nome, horário ou número aproximado.
- A evolução poderá extrair apenas `PEDIDO #123` das mensagens do Tintim SEM persistir o texto completo, e associar após validação de formato/identidade. Requer configurar o evento de mensagem no Tintim e validar um exemplo real; não ativar antes de preparo de segurança.

## Proteções e publicação
1. Reconciliar esse branch com o checkpoint de promoção do Work antes de gerar ZIP Cloudflare final. A promoção tinha alterações em `app/page.tsx`, então aplicar o patch com comparação, não sobrescrever.
2. Rodar testes completos, TypeScript e build sobre o projeto reconciliado.
3. Publicar inicialmente no Cloudflare Preview e inspecionar fluxo de pedido, evento Pixel e redirecionamento Tintim, sem confirmar venda artificial.
4. Somente após aprovação publicar em produção; não alterar Function de pedidos nem gatilhos Purchase.
5. Programar rotação coordenada das credenciais exibidas em prints, sem interromper compras.

## Estado da ponte
`tintim-webhook` v2 em produção Supabase; dois eventos reais v2 recebidos HTTP 200 às 13:11 em 12/10/2026 (America/Belem), seis no total. Identificador de conversa permanece provisório via telefone; ID oficial do Tintim não confirmado.

## Fora de escopo desta etapa
Associação automática de pedido e contato; alteração de `orders` remota; novo disparo Purchase; publicação; análise causal de incrementalidade.
