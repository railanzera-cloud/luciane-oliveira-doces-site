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

## Atualização: pedido #1374 em 18/10, 18h27–18h28

- Após a contagem física anterior de **6 Ninho e 5 Chocolate**, o usuário comunicou **uma única nova saída física**, correspondente a **1 Ninho** no pedido #1374. O pedido também continha 1 Pipoca Gourmet, sem impacto no inventário das Trufadas.
- Verificação somente leitura do banco: #1374 registrado em 18/10 às 18:27:44 (America/Belem), canal WhatsApp, posteriormente `preparing` e `paid` às 18:28:18; hold de Ninho na situação `committed`, quantidade 1. A baixa deste pedido já ocorreu e **não pode ser executada de novo**.
- Após essa baixa, a consulta mostrou Ninho `total_stock=1`, `version=11`; Chocolate `total_stock=3`, `version=12` (sem novos holds depois da contagem além do #1374).
- **Contagem física deduzida:** Ninho **5** (6 - 1) e Chocolate **5**, ainda condicionada à confirmação de que as unidades não estão fisicamente separadas/comprometidas para outros pedidos.
- Diferença nessa leitura: Ninho +4 e Chocolate +2 em relação aos números do banco. NÃO aplicar reposição sem autorização e novo snapshot, sob pena de corrida/dupla baixa.
- Migração anteriormente preparada segue **não aplicada e candidata a testes de integração no banco**; asserções estáticas em CI não garantem correção operacional de migração.
