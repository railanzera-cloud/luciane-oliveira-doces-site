# Entrega: pós-adição premium, doces primeiro, bebidas compactas

**Data:** 10/11/2026 · **Repositório:** `railanzera-cloud/luciane-oliveira-doces-site` · **PR:** #24 (draft, base PR #23)

## Decisão aprovada e experiência

A posição final é carrinho → confirmação do doce → sugestões de outros doces → refrigerantes → entrega ou retirada. Os atalhos contextuais (Fatias, Gourmet, Trufadas, Cones) são filtrados pela disponibilidade e levam aos configuradores respectivos, sem adicionar itens ou preços sozinhos. Grade de 2 colunas no mobile, fotografias e textos oficiais preservados.

A bebida opcional ocupa menos altura que a versão inicial: quatro fotos reais, tamanho/volume, preço, contador sobre a miniatura e botão "+" com alvo 44px. Acessibilidade do contador e feedback preservados. Sem etapa obrigatória de compra, sem popup ou carrossel.

Ao acrescentar um refrigerante, o carrinho cresce acima das ofertas. A implementação mede o cartão antes da atualização e corrige apenas o deslocamento de sua posição visual após React renderizar, sem scroll automático até a próxima etapa.

## Verificação

- GitHub Actions [42837770554](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42837770554): quatro jobs SUCCESS.
- Build de site comercial e testes automatizados; tipos não introduzem erros novos relativos às exceções já documentadas da base.
- WebKit isolado: oito cenários anteriores de complementos e cinco larguras novas (320/375/390/430/1280), ordem e tamanho da grade, fotos, toques em bebidas distintas/repetidas e posição de cartão estável.
- Este resultado não substitui Safari/Instagram em iPhone físico, homologação administrativa real, pedido pago real nem impressão física.

## Pacote manual

`Luciane-Oliveira-Doces-Checkout-Premium-20261110-Cloudflare.zip`

- **Bytes:** 7.500.778; **entradas:** 93.
- **SHA256:** `3c3b5f951a1c9b52c18d01d28ff4dc1db6d61d0d73795911926d573a26ce0e2e`.
- **Perfil:** WhatsApp-only conectado ao Supabase comercial; sem pagamentos online ativados.
- Todas as quatro imagens de refrigerantes, fotos previamente aprovadas, `/`, `/admin`, `/pedido`, scripts de Pages e backend URL compilado verificados.
- Ações produtivas não executadas: Cloudflare, Edge, SQL, estoque, envios, pagamentos e merge.

## Publicação e rollback

Conferir que o backend WhatsApp v35 do checkpoint 52 continua ativo; salvar o deployment Cloudflare anterior. Fazer upload manual do ZIP em Cloudflare Pages; não confundir preview QA sem Supabase com este bundle conectado. Homologar pelo iPhone (Safari e Instagram): doces disponíveis, miniaturas, botões, foco, rolagem, carrinho, recebimento, resumo, pedido WhatsApp e impressão física na cozinha. Sem novos grants/SQL neste refinamento. Se houver regressão, restaurar o deployment frontend anterior e manter backend atual compatível; não reverter a constraint do tipo drink com possíveis pedidos existentes.
