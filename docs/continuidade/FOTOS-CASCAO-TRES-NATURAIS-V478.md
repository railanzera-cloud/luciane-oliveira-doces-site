# V4.7.8 — três Cascões em cenário natural padronizado (13/11/2026)

## Autorização e fotografias

Substituição aprovada de **três e apenas três** fotos individuais/cards da categoria Cascão Trufado. O usuário aprovou as três imagens já geradas com as referências reais que Luciane enviou: mesmo cenário natural de **granito**, parede bege neutra e suporte transparente, sem prolongamentos desfocados nem perfeccionismo artificial. São representações **geradas/editadas** com base em fotografias reais, não fotografias brutas comprobatórias.

- **Ninho com Morango**: SKU `cascao-trufado-ninho-morango`, morango inteiro no topo, casca chocolate escuro, recheio Ninho interior não exposto, R$20. Fonte exata: `a_crisp_well_lit_close_up_product_food_photograp.png`.
- **Prestígio**: SKU `cone-trufado-prestigio`, casca branca coberta de coco, chocolate por cima e beijinho central, R$18. Fonte exata: `a_crisp_close_up_studio_like_food_photograph_of.png`. **Não restaurar a foto branca lisa V4.7.7:** a nova imagem foi explicitamente aprovada.
- **Ferrero Rocher**: SKU `cone-trufado-ferrero-rocher`, chocolate escuro e castanhas na casca, bombom partido no topo, R$20. Fonte exata: `a_sharp_close_up_centered_vertical_product_styl.png`.

Os três já possuíam imagem aprovada no chat. Este release é para a **substituição no site**, não para gerar novas imagens.

## Arquivos e crop

Três grupos `images/{prefix}-20261113-v478.webp`, `images/{prefix}-card-20261113-v478.webp` e `images/{prefix}-20261113-v478-360.webp`: 9 WebPs.
- Foto de detalhe preserva composição vertical 1122 × 1402 do arquivo aprovado; conversão WebP sem retoque no produto.
- Cards 4:5 (600 × 750), com crop superior central e produto como protagonista: Ninho (140,18,982,1071), Prestígio (140,14,982,1066), Ferrero (140,22,982,1075), imagem de referência de 1122 × 1402.
- Miniatura individual 360 × 450.
- Não mudar fotos do Dois Amores, Kinder Bueno, Ninho Nutella e Chocotone, nem a capa com trio, nem demais assets.

## Engenharia e estado de entrega

Branch de base: `fix/cascao-prestigio-branco-v477-20261113` (PR #47, SHA `e1f60abe0c3a1842ba8b6b37d150ed2737e4904a`). Nova branch `fix/cascao-tres-fotos-reais-v478-20261113`.

Em `app/catalog.ts`, trocar somente `image`, `cardImage` e texto alternativo dos três SKUs. Corrigir expectativas históricas de testes que ainda exigiam fotos V475/V477. Nenhum código de checkout, backend, disponibilidade, preços, método de pagamento, Pixel/CAPI, QZ, WhatsApp, bebidas ou outros produtos é modificado.

O ZIP de distribuição **completo** é `Luciane-Doces-Cloudflare-V478-3-Cascoes-Reais.zip`, **13.686.331 bytes / 163 arquivos**, SHA-256 `a0b5817e4ab488201c02f0e8912e909e863b5fac7293993e45a06de329bcf11f`. Derivado da versão completa V477 com SHA-256 verificado `11d15f90b21ab90546f505656e171e3101c631471ffe1d2bb1df43dd1061fed1`. Preserva **128 mídias** antigas byte a byte, acrescenta nove WebPs e substitui as referências no módulo compilado `supabase-config`. Quinze arquivos JS versionados -v478 com referências reescritas para respeitar `Cache-Control: immutable`; índice, rotas e manifesto preservados/coerentes.

Validações locais: ZIP CRC, ausência de duplicatas, 163 entradas e 128 mídias antigas preservadas; referências de 81 imports/rotas JS resolvidas, seis referências de foto de catálogo atualizadas, `node --check` nos 15 módulos JS passando. Não confundir estes resultados com CI da branch, build integral do source, testes Safari físico ou homologação de atendimento real.

**Publicação Cloudflare permanece manual**, nenhuma modificação em Edge/Supabase/SQL/estoque/pedidos e nenhum merge na `main`. Para rollback, republicar ZIP comercial íntegro V477, não usar artefato isolado de CI.
