# Restauração dos filtros e da visão Vendas — 17/10/2026

## Causa identificada
A versão recente das Pipocas Trufadas foi desenvolvida na branch `feature/pipocas-trufadas-pacotes-20261017`. O componente `components/admin-results-panel.tsx` nessa branch ainda era o antigo, contendo somente 7/30/90 dias e abas Sinais de anúncios/Registros do site. A implementação da visão de vendas e filtros adicionais estava preservada em `work/admin-resultados-periodo-personalizado-20261016` (checkpoint `25c1698`), não incorporada ao novo pacote.

## O que foi recuperado
- Nova branch `work/resultados-vendas-restaurados-trufadas-20261017`, criada a partir do HEAD `c6115a8d18800249d65d92ea73c61f13a44dd6d2` das Trufadas.
- Restaurados os componentes de resultados, cliente e modelos, testes, as migrations documentais e o CSS adicional — **sem substituir o CSS inteiro** das Trufadas.
- Preservados `app/admin/page.tsx`, componentes do estoque por sabor, catálogo, imagens AVIF, checkout, scripts comerciais, pagamentos, Tintim, impressão e demais integrações recentes.
- Filtros: Hoje, Ontem, Amanhã, 7 dias, 30 dias, 90 dias e Personalizado (intervalo entre duas datas inclusivas em `America/Belem`). O botão Amanhã só apresenta aviso de consulta futura, **sem criar ou inventar vendas** e sem executar RPC com data futura.
- A tela abre em **Hoje → Vendas**, com total de pedidos criados no período que estejam atualmente `completed` e `paid`. Mantém separadas vendas concluídas sem confirmação de pagamento, pagas em andamento e pedidos criados antes mas concluídos no período. Esta métrica não inclui vendas fora do Supabase e não substitui um extrato de recebimento financeiro.
- Anúncios e Registros continuam disponíveis como visões alternativas e preservam as ressalvas da mensuração.

## Banco e publicação
- As RPCs `admin_get_results_overview_v3(date,date)` e `admin_get_sales_summary_v1(date,date)` foram instaladas anteriormente no Supabase comercial `edqiwvccmboyayojvuea`; verificar sua presença antes da implantação. **Não reaplicar por padrão e não modificar pedidos ou pagamentos**.
- O workflow GitHub Actions foi ampliado para validar os dois relatórios, compilar o ZIP e verificar integridade e marcadores das funcionalidades recuperadas.
- Publicação em Cloudflare: **não autorizada nesta intervenção**. O ZIP produzido no CI precisa ser enviado pelo operador ao Cloudflare Pages. Não alterar `main` nem as branches anteriores.

## Homologação no Safari
Acessar /admin → Resultados, confirmar que aparecem Hoje, Ontem, Amanhã, 7, 30, 90 dias e Personalizado. Conferir as três guias Vendas/Anúncios/Registros, data local correta, e que as Trufadas continuam com estoque por sabor e as fotografias atuais. Comparar a soma dos pedidos concluídos e pagos contra o painel para o mesmo intervalo.
