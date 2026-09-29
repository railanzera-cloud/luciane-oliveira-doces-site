# Crédito, débito e composição WhatsApp — 29/09/2026

Base: f10180cb4590bab610e7a3543ef4024e9d17871d. Continuação incremental das alterações financeiras parciais. Nenhuma publicação no GitHub, Cloudflare ou Supabase executada.

## Regra e implementação

Percentuais centralizados em `supabase/functions/_shared/receipt-card.mjs`: crédito à vista 305 pontos-base e débito 57. O frontend importa o mesmo módulo por `lib/manual-payment-policy.ts`; a Function importa diretamente. Pix e dinheiro não têm acréscimo. Não há parcelamento ou pagamento online novo.

Para base B em centavos e taxa r em pontos-base, cobra-se C = ceil(B × 10000 / (10000 − r)), com BigInt. A tarifa é ceil(C × r / 10000). A identidade C − ceil(Cr/10000) = floor(C(10000−r)/10000) prova que a fórmula encontra o menor C cujo líquido é pelo menos B. Não há percentuais calculados separadamente por produto nem erro de ponto flutuante no cálculo da tarifa. A base inclui produtos e entrega real; subtotal de produtos e entrega permanecem separados nos registros.

| Base | Crédito | Débito |
|---|---|---|
| 25,00 | 25,79 | 25,15 |
| 30,00 | 30,95 | 30,18 |
| 33,00 | 34,04 | 33,19 |
| 49,00 | 50,55 | 49,29 |

Carrinho, bairro, entrega/retirada e pagamento recalculam o total a cada atualização de estado. O servidor reconstitui preços e entrega pelo catálogo confiável, aplica a regra compartilhada e compara o total esperado; não confia em taxa/acréscimo enviados pelo navegador. Alteração de configuração com frontend antigo produz divergência de preço e exige revisão, sem registrar silenciosamente um total diferente. Reenvio idempotente recupera valores originais salvos, inclusive percentual e acréscimo.

## Persistência e compatibilidade

Nova migration: `supabase/migrations/20260929180000_receipt_card_fee.sql`.

Adiciona campos próprios em `orders`: `card_mode` (credit_single/debit ou null), `card_basis_points` e `card_fee`. Mantém enum/método `card_on_delivery`. Pedidos antigos recebem taxa/acréscimo zero e modalidade null, sem inferir crédito ou débito. A restrição monetária inclui o acréscimo e valida a fórmula exata usando numeric no PostgreSQL. Atualiza somente as RPCs de criação e consultas para transportar os campos; mantém privilégios, idempotência, sequência e tokens.

A API aceita cartão genérico legado sem modalidade com acréscimo zero para não interromper o frontend anterior durante a transição. O novo checkout oferece somente crédito/debito, sempre envia a modalidade e limpa a antiga seleção genérica de rascunhos ainda não registrados para exigir nova escolha. Pedidos já registrados conservam seu resultado. Não alterar valores históricos ao trocar taxas futuras.

Criação continua com pagamento pendente e aguardando confirmação operacional. Confirmação manual existente preservada; nenhum Purchase ou efeito financeiro automático foi adicionado. Mercado Pago, webhooks, CAPI, Pixel e Tintim não foram alterados.

## Mensagem e telas

Abertura: “Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.”. Título `*PEDIDO #n*`, sem emoji de caixa. Mantidos nome, itens/personalizações, recebimento, endereço e instruções Pix. Uma única URL gerada de acompanhamento no final; serviço Tintim intacto.

Entrega: Produtos, Entrega, Acréscimo com percentual somente no cartão, Total. Retirada com cartão: Produtos, Acréscimo, Total. Retirada Pix/dinheiro: total compacto, sem entrega zero. Os valores financeiros da mensagem são preenchidos com a resposta registrada do backend, sem recalcular a tarifa dentro da mensagem.

Painel: produtos, entrega, modalidade, acréscimo e total que deve ser informado em “Valor da cobrança”. Informa que não deve haver nova tarifa. Acompanhamento recebe total e acréscimo já incluído; pagamento permanece pendente até confirmação manual. Finalização mantém o WhatsApp predominante e identifica crédito/debito presencial.

## Validação

- 15 testes de matemática e integração PostgreSQL/PGlite local aprovados: referências da maquininha, minimalidade, itens/entregas diferentes, zero no Pix/dinheiro, migration sobre pedido preexistente, registro, modalidade/percentual/acréscimo autoritativos, adulteração, acompanhamento, duplicidade, permissões, confirmação manual e ausência de efeitos automáticos.
- 82 testes direcionados de frontend, mensagem, rastreamento existente, navegação guiada, finalização e painel aprovados.
- Build comercial de produção/ZIP aprovado; git diff --check limpo.
- Typecheck não aponta erros nos arquivos alterados. Permanecem somente os erros de tipos Cloudflare já conhecidos em db/index.ts e worker/index.ts, fora deste escopo.
- Não houve testes de Mercado Pago, acesso ao Supabase remoto, cobrança real ou homologação em Safari real. Conferir no Preview as opções longas de cartão, troca de bairro/modalidade, mensagem, painel e acompanhamento antes do corte comercial.

## Ordem de ativação — somente após autorização

1. Preservar ZIP comercial anterior, cópias das Functions atuais e backup do banco. Conferir histórico de migrations do ambiente alvo; as migrations anteriores já foram aplicadas conforme informado pelo usuário.
2. Aplicar SOMENTE `20260929180000_receipt_card_fee.sql`, entregue com transação begin/commit. Não reaplicar migrations antigas, resetar banco ou sequência. Homologar primeiro em ambiente de validação quando disponível.
3. Publicar `create-whatsapp-order` com `_shared/commerce-catalog.mjs` (sem alteração comercial nesta rodada) e `_shared/receipt-card.mjs`; publicar também `public-order-status` atualizada. Preservar configuração verify_jwt=false e validações de origem/chave existentes. Não alterar segredos, permissões/RLS ou publicar outras Functions.
4. Homologar backend e novo frontend em Cloudflare Preview: R$25 + entrega R$8 → crédito R$34,04; débito R$33,19; Pix/dinheiro R$33. Conferir valores no registro/painel/acompanhamento, reenvio sem duplicidade e pagamento pendente. Não informar taxa adicional na maquininha.
5. Somente após validar banco e Functions, publicar manualmente o novo ZIP comercial. O frontend novo depende das colunas/RPCs/Functions atualizadas, inclusive para carregar o painel.
6. Em caso de rollback do frontend, manter migration e dados novos. A versão anterior do painel não detalha o acréscimo, embora mostre o total salvo. Não remover colunas, reverter totais de pedidos ou restaurar Functions antigas automaticamente; isso pode ocultar detalhes dos pedidos com taxa. Planejar a correção preservando todos os registros.

Alterações futuras de percentuais: mudar as constantes compartilhadas, rodar os testes pertinentes, republicar a Function e reconstruir/publicar o frontend em sequência controlada. Pedidos anteriores mantêm o percentual registrado.

## Arquivos alterados

- app/page.tsx; app/order-checkout.ts; app/pedido/page.tsx.
- components/admin-orders-panel.tsx; components/whatsapp-order-result.tsx.
- lib/admin-orders-client.ts; lib/manual-payment-policy.ts; lib/site-order.ts.
- supabase/functions/_shared/receipt-card.mjs (novo).
- supabase/functions/create-whatsapp-order/index.ts; supabase/functions/public-order-status/index.ts.
- supabase/migrations/20260929180000_receipt_card_fee.sql (nova).
- tests/receipt-card.test.mjs; tests/manual-orders.integration.mjs; tests/menu-refinement.test.mjs; tests/order-final-refinements.test.mjs; tests/manual-orders.browser.mjs.
- Este documento.
