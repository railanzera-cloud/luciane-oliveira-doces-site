# Reconciliação de Pipocas Trufadas — Plano controlado

Data: 18/10/2026; fuso America/Belem. Supabase: edqiwvccmboyayojvuea.

## Evidências
Luciane contou fisicamente 6 Ninho e 5 Chocolate, sem saída posterior segundo o operador. Banco após confirmações anteriores: Ninho=2, Chocolate=3 às 18h05. Reservas de pedidos confirmados com expires_at vencido deixam de contar no cálculo original. Confirmar de novo imediatamente antes de atuar.

## Estratégia
As contagens administrativas são **absolutas** (não acréscimos). O campo last_physical_recount_at cria marco para evitar nova baixa de pedidos criados antes da contagem. Helper único para estoque disponível calcula reservas confirmadas sem permitir expiração silenciosa enquanto pedido estiver ativo. O estado operacional completed ou pagamento realmente paid aciona consumo, sem fabricar payment_status/paid_at. Cancelamento libera a reserva, sem restauração fictícia de pacote já consumido.

## Não aplicado
A migration no GitHub é candidata, não existe execução em produção autorizada. Não ajustar estoque nem marcar pagamentos. Desenhar teste de integração em banco isolado antes de executar em produção.

## Pré-condições para aplicação
1. Confirmar se os 6/5 são unidades **livres para novas vendas**, já excluindo pacotes separados para encomendas ainda não entregues.
2. Conferir novamente valores atuais, versões, horários, reservas e novas compras, sem dados pessoais em relatório.
3. Backup das funções existentes; programar intervenção segura sem reabrir loja.
4. Com aprovação explícita, aplicar migração; registrar a contagem absoluta via RPC protegida que preserva versão e marco.
5. Validar vitrine/admin, estado de reservas, QZ e comportamento após confirmação de pagamento antigo, sem pagamentos artificiais.
6. Não misturar branch de checkout nem cozinha: integração futura precisa preservar o SQL de impressão já aplicado e todo o código comercial.
