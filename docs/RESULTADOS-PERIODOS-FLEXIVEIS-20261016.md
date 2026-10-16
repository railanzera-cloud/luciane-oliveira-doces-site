# Painel de pedidos — Resultados por período (16/10/2026)

## Escopo
Implementação isolada do filtro na aba **Resultados** de `/admin`.
Não muda vitrine, pedidos, estoque, Tintim, Meta, Pix, faturamento contábil nem status.

## Comportamento
- Atalhos: Hoje, Ontem, 7, 30 e 90 dias.
- Personalizado: duas datas inclusivas e botão **Aplicar período**. Mostra o intervalo efetivamente consultado.
- Todas as datas correspondem ao calendário de **America/Belem**. Hoje começa à meia-noite local; ontem é exclusivamente o dia anterior. 7/30/90 dias incluem o dia atual e os anteriores.
- Proteções para datas inválidas, invertidas, futuras e intervalos maiores que 3.660 dias.
- A consulta read-only usa a nova RPC `admin_get_results_overview_v3(p_start_date date,p_end_date date)`.
- A RPC antiga v2 continua intacta para rollback; v3 devolve todos os mesmos agregados com período exato, protegida por `lod_require_authenticated_staff`.
- **Importante:** valores refletem a situação **atual** de pagamento dos pedidos **criados** no intervalo, incluindo possíveis testes; não são recebimentos por data de pagamento nem o faturamento total da loja. O Tintim não está integralmente conciliado.

## Implantação e verificações (16/10/2026)
1. **Concluído:** aplicada no Supabase comercial `edqiwvccmboyayojvuea` a migration `supabase/migrations/20261016220000_admin_results_custom_dates_v3.sql`. Função `admin_get_results_overview_v3(date,date)` instalada sem substituir v2, sem alterar pedidos e sem mudar status/pagamentos.
2. **Concluído:** conferência em runtime de assinatura v3, preservação v2, `EXECUTE` negado ao papel `anon`, concedido a `authenticated`, e proteção interna `lod_require_authenticated_staff()`. Consulta somente agregados; não retorna dados pessoais.
3. **Concluído na revisão funcional anterior:** GitHub Actions validou build, TypeScript, suíte completa, ZIP e CRC. Este checkpoint documental ainda exige sua própria CI para confirmar o artefato do SHA final.
4. **Pendente:** conferir visualmente os filtros Hoje, Ontem e intervalo arbitrário no Safari do iPhone com o login da operação.
5. **Não publicado:** Cloudflare Pages permanece intocado. Publicar somente com autorização específica usando o ZIP do commit final; não fazer merge na `main`.
6. Não há necessidade de reconfigurar chaves, webhooks ou credenciais.

## Verificações
- Testes focados `tests/admin-results-overview.test.mjs` e `tests/admin-results-dates.test.mjs` adicionados/atualizados.
- Checar CI/TypeScript/build do commit para validação final; Safari físico depende de homologação pela operação.

## Complemento comercial — vendas realmente concluídas (16/10/2026)
- O painel abre com **Hoje → Vendas**; as outras duas leituras (**Anúncios**, **Registros**) foram preservadas.
- Card principal agrega somente pedidos **criados no período escolhido**, com `order_status='completed'` e `payment_status='paid'`. Usa `total` do pedido (inclui entrega, não é lucro). É o valor de vendas **registradas no painel**, não o faturamento total fora dele nem extrato bancário.
- Exibe separadamente concluídos sem confirmação de pagamento, pagos em andamento e pedidos antigos concluídos dentro do período; não soma esses grupos silenciosamente ao total principal.
- Data de inclusão principal = `created_at`; `completed_at` só serve para a lista separada de pedidos antigos concluídos. Datas civis em `America/Belem`.
- Nova RPC read-only `admin_get_sales_summary_v1(date,date)`; não altera pedidos, histórico de status, pagamentos ou a RPC existente de atribuição/relatório.
- Condição real do banco em 16/10: havia 12 pedidos criados no dia, concluídos e pagos, totalizando R$ 450,58, e um concluído com pagamento ainda pendente (R$ 30,00). Os dados podem mudar, inclusive pela confirmação posterior de pagamentos, e incluem possíveis testes.
- **Migração aplicada:** `admin_sales_summary_v1_20261016` no Supabase comercial `edqiwvccmboyayojvuea`. Verificado: RPC de vendas existe, RPC v3 anterior preservada, `anon` sem `EXECUTE`, `authenticated` com `EXECUTE`, guarda `lod_require_authenticated_staff()` mantida. Os dados de pedido não foram modificados.
- **Validação do código:** build, TypeScript, suíte completa e ZIP (incluindo validação de CRC) aprovados no GitHub Actions #38968235758 para `4850fb0`.
- **Pendente:** conferência da tela no Safari com login da Luciane, seguida de publicação somente com autorização, sem alterar a branch `main`.
