# V4.7.7 — Prestígio totalmente branco (13/11/2026)

**Implementação aprovada:** substituir somente a fotografia atual do Cascão Trufado — Prestígio por **exatamente a última imagem branca já gerada** pelo assistente em 13/11, fornecida em `prestígio_cascão_branco_sobre_granito.png`. Não gerar nova ilustração/fotografia. A casquinha e a tampa são inteiramente claras, com textura de coco, mantendo a bancada de granito, o suporte transparente e o enquadramento dos cards v475.

**Base:** V4.7.6, branch `fix/cascao-fotos-sem-desfoque-preco-v476-20261113` (PR #46), HEAD `f8473dab526775cbc9e04ff53e1fc437ca049e37`. Nova branch isolada `fix/cascao-prestigio-branco-v477-20261113`. Nada foi mesclado na `main`.

**Arquivos do novo sabor:** `images/cone-trufado-prestigio-20261113-v477.webp` (1122×1402), `images/cone-trufado-prestigio-card-20261113-v477.webp` (600×750, crop do original [160,110,960,1110]) e `images/cone-trufado-prestigio-20261113-v477-360.webp` (360×450). Só essa foto muda no catálogo e no ZIP. Alinhamento visual: topo destacado, casca centralizada, sem blur artificial.

**Código fonte:** `app/catalog.ts` recebe referências v477 para `image` e `cardImage` e texto alternativo fidedigno. Os testes que validavam caminhos v475 da foto do Prestígio são atualizados. **Não alterar** os cinco outros sabores, a foto do trio, a UX de bebidas, código do backend, catálogo autoritativo/preço R$18, estoque, disponibilidade, pagamentos, QZ/WhatsApp ou entrega.

**Pacote Cloudflare completo:** `Luciane-Doces-Cloudflare-V477-Prestigio-Branco.zip` (154 arquivos, 12.644.373 bytes), SHA-256 `11d15f90b21ab90546f505656e171e3101c631471ffe1d2bb1df43dd1061fed1`. Base v476 validada por SHA-256 `8cca763e0b7c927c75affb1b5529756f8076d33dda415a8fc6c7a3176ef11d37`. Todos os 121 arquivos de mídia anteriores preservados byte a byte, apenas três novos WebPs adicionados; 15 assets JS renomeados `-v477.js` para cache busting devido ao `immutable` e referências HTML/manifesto atualizadas. ZIP CRC, referências de imagens e `node --check` dos 15 módulos passaram. Binários ilustrativos estão no ZIP completo, não no repositório; não publicar ZIP de CI isolado.

**Produção:** nenhum upload Cloudflare, nenhuma escrita Supabase/SQL/Edge, nenhum pedido real, nenhum merge. Após publicação manual, validar card e fotografia em detalhes no iPhone/Safari/Instagram e confirmar o valor de R$18. Rollback visual: pacote V4.7.6, preservando backend como está. Imagem gerada/editada não substitui verificação física do acabamento vendido.
