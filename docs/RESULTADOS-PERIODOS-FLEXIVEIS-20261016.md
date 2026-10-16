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

## Implantação (não realizada neste checkpoint)
1. Aplicar **primeiro** a migration `supabase/migrations/20261016220000_admin_results_custom_dates_v3.sql` no Supabase comercial `edqiwvccmboyayojvuea`. Sem ela, o novo painel informa que o filtro não foi ativado.
2. Validar os resultados com uma conta da operação e comparar totais com pedidos de hoje, ontem e intervalo arbitrário no Safari.
3. Publicar somente com autorização e usando a mesma revisão validada. Não alterar `main` automaticamente.
4. Sem necessidade de reconfigurar chaves, webhooks ou credenciais.

## Verificações
- Testes focados `tests/admin-results-overview.test.mjs` e `tests/admin-results-dates.test.mjs` adicionados/atualizados.
- Checar CI/TypeScript/build do commit para validação final; Safari físico depende de homologação pela operação.
