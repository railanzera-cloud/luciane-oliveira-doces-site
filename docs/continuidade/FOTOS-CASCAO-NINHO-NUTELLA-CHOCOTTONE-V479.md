# V4.7.9 — Ninho Nutella e Chocottone: nome + imagem (13/11/2026)

## Autorização e limite

O usuário solicitou a mudança de nome de um único sabor na categoria Cascão Trufado — de **Ninho Nutella e Chocotone** para **Ninho Nutella e Chocottone** (com dois T) — e a substituição da imagem por **exatamente a última já gerada** nesta conversa, `a_crisp_high_detail_studio_lit_close_up_product.png`. Nenhuma geração adicional. Ambiente: bancada de granito, parede bege natural, suporte de acrílico transparente. Produto: casca escura com cobertura de chocolate e pedaço de chocottone cortado no topo.

- **SKU técnico imutável:** `cascao-trufado-ninho-nutella-chocotone`.
- **Item-key imutável:** `cascao_ninho_nutella_chocotone`.
- **Preço imutável:** R$20 / 2000 centavos, variante `unidade`.
- **Imagem principal:** `images/cascao-trufado-ninho-nutella-chocotone-20261113-v479.webp` (1122×1402).
- **Card 4:5:** `images/cascao-trufado-ninho-nutella-chocotone-card-20261113-v479.webp` (600×750, crop 140/20–982/1072).
- **Miniatura:** `images/cascao-trufado-ninho-nutella-chocotone-20261113-v479-360.webp` (360×450).
- **Texto alternativo** atualiza a descrição para corresponder à imagem efetivamente aprovada.

## Engenharia

Base V4.7.8: PR #48 / branch `fix/cascao-tres-fotos-reais-v478-20261113` / HEAD `ca5845fa11cf1caacc8735e246dccd125495d4b5`. Incremento isolado `fix/cascao-ninho-nutella-chocottone-v479-20261113`.

O catálogo comercial `app/catalog.ts` muda apenas nome visível, referências de duas imagens e texto alternativo do SKU. O código de origem do backend `supabase/functions/_shared/commerce-catalog.mjs` recebe somente atualização do nome para manter preparado o contrato de mensagens/checkout, **sem alterar item-key, preços, payload, versão de Edge ou SQL**. **A Edge Function em produção NÃO foi implantada**: mensagens geradas pela Edge atualmente ativa ainda podem apresentar a grafia anterior até futura implantação específica e autorizada. Não alegar consistência produtiva ponta a ponta.

Os testes históricos de referências e rótulos foram atualizados e adicionado teste dedicado. Os demais cinco Cascões, as fatias de Chocottone de Natal, categorias, estoque, taxas, WhatsApp, Mercado Pago, Pixel/CAPI e cozinha ficam intocados.

## Pacote integral Cloudflare

Arquivo para publicação manual: `Luciane-Doces-Cloudflare-V479-Ninho-Nutella-Chocottone.zip`, SHA-256 `0c397cc4e99cc7fa5746c71601dc2636e057b07e8b235dbd63b32cd5837e900a`; **166 arquivos / 14.054.320 bytes**. Derivado da V478 de SHA-256 verificado `a0b5817e4ab488201c02f0e8912e909e863b5fac7293993e45a06de329bcf11f`, com **137 mídias anteriores preservadas bit a bit**, três novos WebPs e renomeação coordenada de 15 bundles JS `-v479.js` para contornar cache `immutable`. Refs de imports, índice, manifestos, 81 links JS, ZIP CRC e 15 `node --check` aprovados. Não usar ZIP de CI isolado porque os assets históricos podem estar ausentes.

A publicação Cloudflare continua **manual**. Não houve deploy Edge, SQL, mudança de status, pedidos reais ou merge na `main`. Testes de regressão de CI no novo SHA e Safari físico devem ser confirmados separadamente. Rollback: republicar pacote íntegro V478, preservando os serviços produtivos.
