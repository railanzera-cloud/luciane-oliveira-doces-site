# Operação — Chocolate com Morango: voltar à venda normal (26/10/2026)

## Estado aplicado no Supabase comercial
Projeto: `edqiwvccmboyayojvuea`, fuso `America/Belem`. Data da verificação: **26/10/2026 ~05h29** (hora local).

Pedido do gestor: encerrar a pré-reserva temporária de 25/10 e colocar Chocolate com Morango para venda normal. Foi informado estoque físico remanescente de **8 fatias**, a ser monitorado manualmente. Não extrapolar isso como quantidade transacional no banco.

Alterações efetivamente aplicadas numa única transação SQL:
- `public.slice_preorder_batches`, item_key `slice_chocolate_morango`: `enabled=false`. Preservados capacidade (21), reserved_units (9), external_reserved_units (0), datas históricas e alocações.
- `public.menu_availability`, mesma chave: `status='available'`.
- `public.store_settings.orders_open` permaneceu `false` (a loja NÃO foi reaberta).
- Não houve alteração em pedidos, pagamentos, histórico, impressora, código do site, estoque de outros produtos, Meta/Tintim ou Cloudflare.

**Verificação de retorno:** `public.public_slice_preorder()` retornou `active=false`; item disponível normalmente. A vitrine lê `snapshot.slicePreorder` somente se active, portanto os elementos de pré-reserva desaparecem quando o cliente recebe os dados atualizados.

**Atenção:** as fatias normais não possuem contador automático de estoque no banco atual (ao contrário de trufadas). A loja deve controlar as 8 unidades fisicamente e marcar `sold_out` em Disponibilidade ao esgotar. Não anunciar limite de oito como se estivesse protegido atomicamente no checkout.

## Reuso numa próxima fornada
**Não basta simplesmente religar `enabled`**: as datas `ready_at` e `expires_at` estão no passado, e o lote anterior preserva alocações `reserved`. Uma futura pré-reserva para a mesma fatia precisa de novo lote, novos horários, capacidade validada, controle de saldos, sem liberar ou contabilizar novamente reservas antigas. Em outra fatia, implementar isolamento por item_key e não copiar literalmente as regras que estão fixadas em Chocolate com Morango e em 25/10/2026. Só ativar quando solicitado.

O mecanismo de impressão/aceite normal segue inalterado; as exceções de pré-reserva de 25/10 expiraram e estão apenas preservadas no código histórico.

Branch anterior de referência: `fix/pre-reserva-aceite-impressao-20261025` @ `7b3407c484d48ac5aa066f52960747934ef304f6`.
Esta branch/documento registra **somente a ação operacional já aplicada**, não requer novo ZIP nem publicação Cloudflare.
