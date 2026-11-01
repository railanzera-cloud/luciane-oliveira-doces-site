# Refinamento Trufadas — Safari iPhone — 01/11/2026

Branch: `work/trufadas-ux-safari-20261101`, derivada da revisão
`a8dddeec188c9a8d0865f8f35a97afb0ab80bd00` (três sabores P/M/G,
fotografias aprovadas, Últimas Fatias e correção QZ). Não confundir com main.

## O que muda somente na apresentação comercial
- Três cartões compactos em uma linha no Safari (sem Coco Queimado isolado).
- Não dizer "Esgotado" quando o cliente ainda não escolheu sabor.
- Tamanhos P/M/G só selecionáveis com estoque conferido e saldo positivo.
- Guia de preço respeita o sabor selecionado; não reaproveita "a partir de
  R$ 14,90" se Ninho começa em R$ 15,90.
- Confirmação exibe sabor, tamanho, quantidade e valor total.
- Barra inferior desaparece antes de a variante ficar pronta e quando o
  botão principal de compra está visível.
- Opções de Gourmet/Fatias mais compactas e microinterações discretas, com
  foco acessível, safe-area Safari e `prefers-reduced-motion`.

## Limites da alteração
- NÃO muda catálogo, preços, SKU, tabelas, estoque, reservas, Auth, RLS,
  funções SQL, WhatsApp, Pix, checkout, Meta/Tintim, QZ ou impressora.
- Não inventa gramagens; não ativa/desativa estoque.
- Nenhum deploy automático e nenhuma alteração no Supabase comercial.
- Sucesso de CI não é validação física Safari/QZ. É necessária conferência
  manual no iPhone e, se houver pedidos, no fluxo completo antes do lançamento.

## Critérios de saída
`build`, TypeScript, suíte automatizada e pacote Cloudflare na mesma
revisão GitHub, sem regressões de Últimas Fatias, CRM ou cozinha.
