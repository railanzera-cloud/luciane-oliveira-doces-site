# Resultados — diagnóstico de cobertura (12/10/2026)

Esta etapa **não** mede todos os resultados dos anúncios e **não** substitui o relatório do Tintim.

## Objetivo e fonte de dados

- RPC read-only e autenticada `admin_get_results_overview_v2(7|30|90)`.
- Utiliza todos os pedidos criados no Supabase dentro do período informado; o limite de
  100 da lista da aba Pedidos **não** se aplica à RPC.
- A integração entre pedido e conversa do Tintim foi ativada em 12/10/2026 e **não**
  reconstruiu todo o histórico de conversas anterior à ativação.
- O evento Purchase continua controlado pelo Tintim, sem novos disparos por este relatório.
- Não se usa dado de mensagem, endereço, telefone, nome ou identidade na resposta da RPC.

## Diagnóstico exclusivo — um pedido em uma categoria

Em ordem de prioridade:

1. `tintim_campaign`: campanha preservada em snapshot do Tintim para aquele pedido.
2. `saved_utm_campaign`: parâmetro `utm_campaign` gravado no pedido, sem vínculo
   Tintim. **Não sabemos se veio de uma visita atual ou anterior.**
3. `meta_link_identifier`: `fbclid` ou `tintim_fbid` no pedido, sem campanha
   classificada acima. **Não é prova de anúncio pago nem de clique novo.**
4. `bio_without_campaign_or_click_id`: a visita atual contém `link_in_bio`,
   sem os sinais anteriores.
5. `unclassified`: sem evidência suficiente. **Não equivale a orgânico.**

Os totais são mutuamente exclusivos e devem somar exatamente à quantidade de pedidos
criados no período; o app rejeita qualquer RPC que viole esse invariante.

## Link da bio é um recorte, não outra categoria de vendas

Contabilizar `bio_orders` e `bio_with_fbclid` como subconjuntos da mesma base.
Eles **não podem** ser somados às categorias acima.

No conjunto de 30 dias conferido em 12/10/2026: 225 pedidos, 64 com link da bio na
visita atual, 63 desses com `fbclid`; as categorias exclusivas somavam
4 / 28 / 81 / 1 / 111 respectivamente. Esses valores são uma fotografia da data da análise.

## Registros comerciais do painel — cobertura incompleta

- O número de pedidos não é número de vendas efetivadas.
- `paid_orders`: somente `payment_status='paid'` no painel e pedido não cancelado.
- `pending_orders`: sem confirmação de pagamento **neste painel**, não significa
  cliente inadimplente ou venda perdida.
- `paid_amount`: soma marcada como paga **no Supabase**, não é o faturamento real da loja.
- Vendas disparadas no Tintim pelo WhatsApp podem não alterar `payment_status`.
- O relatório não mostra ROAS, receita incremental ou lucro e não deve ser usado para
  reportar o desempenho completo de anúncios.

O período se refere a quando o pedido foi criado; o status de pagamento é o status
atual desses pedidos, não necessariamente o recebimento no intervalo.

## Próxima integração para cobertura comercial real

É preciso identificar e homologar os campos reais enviados quando Luciane dispara
um gatilho de venda no Tintim. Eventos `lead_update` e similares não são prova,
por si só, de pagamento. Compras repetidas na mesma conversa precisam de vínculo
individual por pedido e idempotência; casos ambíguos requerem conferência.
Não alterar Purchase nem confirmar pagamento automaticamente antes dessa validação.

## Segurança e compatibilidade

- Mantém `admin_get_results_overview` antiga para rollback; v2 é nova função.
- `anon` sem `EXECUTE`; `authenticated` usa controle atual `lod_require_authenticated_staff`.
- Não amplia o acesso ao CRM nem altera RLS ou checkout.
- Ainda falta fortalecer a autorização de funcionários: autenticação atual não
  constitui allowlist explícita, assunto para etapa isolada após homologar contas.
