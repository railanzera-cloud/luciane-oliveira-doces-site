# Hotfix de aceitação automática de pré-reservas — 25/10/2026

Base GitHub **fix/pre-reserva-impressao-automatica-20261025** @ `4eea1ef93d87629677efbf3173608d9a12c4714f`.
A falha anterior foi confirmada em produção: as comandas dos pedidos #1423 e #1424 tinham print_jobs `printed`, mas o status dos pedidos continuava `new`. O gatilho `lod_auto_accept_whatsapp_for_kitchen` original excluía pré-reservas para impedir aceitação antes da validação do lote; a correção da impressão não tratou a transição `new → confirmed`.

## Fluxo correto

1. Site cria pedido WhatsApp `new`, `payment_status` como origem, SEM marcar pago.
2. Item `slice_chocolate_morango` é registrado e reserva capacidade atômica por trigger existente.
3. Trigger de **alocação** confirma automaticamente a ordem **somente** se houver reserva válida, modo cozinha e fila habilitados, pedido de 25/10, sem cancelamento.
4. Registra histórico `new → confirmed` sem alterar pagamento e enfileira comanda com `initial:<order_id>` / `ON CONFLICT DO NOTHING`; a lógica de claim QZ continua exclusiva do Windows.
5. Já impressos não recebem segunda comanda. Reconciliar pedidos válidos `new` do mesmo dia com UPDATE seletivo e histórico, sem mexer no financeiro.

A exceção é estritamente limitada a reservas de Chocolate com Morango de **25/10/2026** até meia-noite America/Belem. Não altera disponibilidade, preço, estoque, Meta, Tintim, layout, fotos, Cloudflare ou produto Coco Cremoso.

## Homologação
- Inspecionar status #1423, #1424 no Supabase; garantir `confirmed`, pagamento inalterado e impressão inicial única.
- Um próximo pedido novo legítimo deve entrar como `confirmed` e criar apenas um trabalho inicial automaticamente.
- Conferência física da impressora QZ requer a Luciane.
- Não criar pedidos falsos nem reimprimir automaticamente.
- Não publicar site no Cloudflare nem alterar main; back-end SQL aplicada separadamente e documentada.
