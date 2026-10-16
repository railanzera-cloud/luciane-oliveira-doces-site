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
