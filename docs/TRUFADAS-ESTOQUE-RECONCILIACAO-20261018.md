# Reconciliação de Pipocas Trufadas — Plano controlado

## STATUS FINAL — APLICADO EM PRODUÇÃO EM 18/10/2026

- **Autorização:** usuário autorizou correção da base comercial e reconciliação, confirmando 5 Ninho e 5 Chocolate livres para novas vendas após #1374.
- **Projeto exclusivo:** Supabase `edqiwvccmboyayojvuea`; sem publicação de frontend Cloudflare.
- **Primeira migração aplicada:** `trufadas_stocktake_reservation_reconcile_20261018` versão `20261018214151`. Corrige reserva de pedidos confirmados e impede dupla baixa dos pedidos históricos anteriores à contagem física. Função auxiliar protegida de acesso anon/authenticated direto.
- **Reconciliação transacional concluída:** travas por sabor, verificação de versões e de novas movimentações. Última contagem física reconciliada em `2026-10-18 18:43:08 America/Belem`. Ninho de total_stock 1→5 (versão 11→12); Chocolate de 3→5 (versão 12→13).
- **Segunda migração aplicada:** `trufadas_stocktake_cutoff_stability_20261018` versão `20261018214755`. Congela a referência histórica para que novas edições de estoque não libertem reservas pós-contagem e impede reativação de reservas vencidas sem estoque livre.
- **Validação real, somente leitura:** `public_crocante_inventory()` chamada com role `anon` retornou **5 Ninho / 5 Chocolate**. `lod_crocante_active_reserved` retornou 0 de reserva pós-contagem. A função admin_set preserva `last_physical_recount_at` e o trigger de ordem exige saldo para renovar reserva vencida.
- **Histórico preservado:** 20 holds antigos em estado `held` (22 unidades), vinculados a pagamentos ainda pendentes no banco. Eles permanecem auditáveis e não são subtraídos novamente da contagem física. Nenhum pagamento foi alterado.
- **CI completo:** execução `39169350254`, commit `f4ff201753f19a342bbd9eff01c61436d2156dcc`, **512 testes aprovados / 0 falhas**, build/TS/ZIP válidos. A migração foi aplicada no Supabase e verificada; o ZIP NÃO precisa ser publicado, pois não houve alteração do frontend para esta correção.
- **Limites de evidência:** não geramos pedido real para teste; confirmação financeira de pedido histórico após a correção precisa de monitoramento operacional por amostra. Não declarar homologação da impressora ou fluxo financeiro nesta intervenção.
- **Próxima operação da Luciane:** atualizar a aba Disponibilidade para carregar os novos números. Futuras edições de `Pacotes em estoque` representam o total físico cadastrado **incluindo reservas novas ativas**, pois `Disponíveis` é calculado descontando essas reservas. Contagem anterior à reconciliação ficou isolada pelo marco histórico.

---


Data: 18/10/2026; fuso America/Belem. Supabase: edqiwvccmboyayojvuea.

## Evidências
Luciane contou fisicamente 6 Ninho e 5 Chocolate, sem saída posterior segundo o operador. Banco após confirmações anteriores: Ninho=2, Chocolate=3 às 18h05. Reservas de pedidos confirmados com expires_at vencido deixam de contar no cálculo original. Confirmar de novo imediatamente antes de atuar.

## Estratégia
As contagens administrativas são **absolutas** (não acréscimos). O campo last_physical_recount_at cria marco para evitar nova baixa de pedidos criados antes da contagem. Helper único para estoque disponível calcula reservas confirmadas sem permitir expiração silenciosa enquanto pedido estiver ativo. O estado operacional completed ou pagamento realmente paid aciona consumo, sem fabricar payment_status/paid_at. Cancelamento libera a reserva, sem restauração fictícia de pacote já consumido.

## Registro histórico — antes da aplicação
Antes da autorização, a migration no GitHub era candidata. Esse estado foi superado pela aplicação documentada no STATUS FINAL acima. Não ajustar estoque nem marcar pagamentos. Desenhar teste de integração em banco isolado antes de executar em produção.

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

## Blindagem posterior à aplicação do marco físico
- Migração complementar `20261018222000_trufadas_stocktake_cutoff_stability.sql`: depois de definir o marco histórico de contagem, mudanças administrativas comuns de estoque preservam esse marco e continuam contabilizando reservas de pedidos futuros. Sem essa proteção, um ajuste posterior poderia inadvertidamente tornar reserva ativa disponível.
- Se pedido futuro tinha reserva vencida e só foi confirmado tarde, ela só passa a reserva sem prazo se a quantidade disponível comportar. Caso contrário, passa a `shortage`, sem inventar pagamento ou criar pedido adicional.
- Não gera mudança em saldos ou pedidos na execução. Aprovação/validação de CI é pré-requisito para aplicar.
