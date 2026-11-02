# Reconstrução premium da entrada comercial — 02/11/2026

## Referência e linha de base
- Base: `work/vitrine-editorial-20261102` em `e7fb01fa506af4e3567a4d6e460693cc89b7f4bb`, já implementada no site como lista editorial clara. Não usar `main` como base.
- Nova linha isolada: `work/vitrine-premium-reconstrucao-20261102`.
- Pedido: reconstruir visualmente as três escolhas com real profundidade, mantendo legibilidade, CTA forte e identidade chocolate/cobre/creme. Referência aprovada: hero de pacotes + Gourmet/Fatias complementares.

## Implementação
- Trufadas em cartão principal com fotografias REAIS de Ninho e Paçoca e preço inicial computado de `app/catalog.ts`; nunca substituir produtos reais por imagens sintetizadas no site.
- Gourmet e Fatias como duas escolhas visuais com fotografias maiores e botões de toque de 44px, cada qual seu destino comercial.
- Cabeçalho enxuto, título editorial, texto curto e serviço após produtos; não retornar à superfície branca dominante do modelo anterior.
- CSS premium isolado em `app/storefront-collection-premium.css` importado DEPOIS do CSS de entrada antigo em `app/layout.tsx`.
- Estado de indisponibilidade e sem confirmação segue o MESMO catálogo e Supabase. Não inventar escassez, capacidade, prazo, preço ou campanhas.
- Uma única área clicável por cartão; navegação via funções existentes `openLimitedCupEdition` e `selectCategory`.
- Estilos para 320–350px (cartões empilhados), 351–759px (hero + 2 cartões), desktop, hover, foco e motion reduced.

## Escopo e limites
Exclusivamente a página inicial sem categoria ativa. Não foi editada nenhuma API, Edge Function, tabela, trigger, pagamento, controle de estoque, QZ, comanda ou pedido. Persistem as três categorias permanentes. O hotfix live `create-whatsapp-order` v25 **não é redeployado** pelo ZIP Cloudflare.

## Homologação
- `npm run build`, `tsc --noEmit`, `node --test tests/*.test.mjs`, ZIP Cloudflare do MESMO SHA.
- Preview Chromium/WebKit 320,375,390,430 e desktop contra a versão de 02/11; comparar captação de layout, contrastes, overflow, escolha de categoria, navegação histórica, URLs UTM e estoque indisponível.
- Não declarar Safari iPhone físico homologado por testes em WebKit desktop.
- Entregar ZIP diretamente, sem publicar no Cloudflare nem alterar `main`.

## Critério visual
A nova imagem deve superar a versão atual em desejo fotográfico, distinção de três produtos, hierarquia comercial e percepção premium, preservando contraste e botões. Testes verdes não são prova de aumento de conversão; requerem observação pós-deploy.
