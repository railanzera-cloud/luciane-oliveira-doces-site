# Entrega técnica — Cascão Trufado e Natal R$22 — V4.3 (12/11/2026)

## Alterações autorizadas
- Categoria exibida como **Cascão Trufado**; preservar ID técnico `cones`, chave `category_cones`, carrinhos, histórico e status remoto. Os três sabores antigos (Prestígio R$14, Dois Amores R$14, Ferrero Rocher R$16) continuam com seus SKUs e preços anteriores; somente o nome comercial da categoria/unidade foi atualizado.
- **Kinder Bueno** `cascao-trufado-kinder-bueno` / `cascao_kinder_bueno`, R$20.
- **Ninho com Morango** `cascao-trufado-ninho-morango` / `cascao_ninho_morango`, R$20.
- **Ninho Nutella e Chocotone** `cascao-trufado-ninho-nutella-chocotone` / `cascao_ninho_nutella_chocotone`, R$20.
- Quatro fatias individuais da coleção Natal (Ninho com Nutella, Ferrero Rocher, Casadinho e Morango com Brigadeiro Branco e Chocolate) passam a **R$22 cada**, sem alterar ID, quantidade, fotos, opções ou disponibilidade.
- Os preços precisam coincidir no catálogo React e no cotador autoritativo `supabase/functions/_shared/commerce-catalog.mjs`. Apenas trocar o frontend NÃO ativa novos valores nem permite novos SKUs.

## Fotografias
- Três imagens fornecidas pela loja em 12/11/2026, na ordem acima; sem geração ou retoque. Preservar composição, cor e enquadramento original.
- WebPs convertidos a partir das três fotos: detalhe 1122×1402, cartão 600×750 e responsivo 360×450; 9 arquivos em `images/cascao-trufado-...-20261112.webp`.
- As **8 fotos de Natal** do V4.2 permanecem byte-a-byte, com SHA-256 aprovados em `scripts/package-natal-v4-cloudflare.py`.
- Os 9 WebPs de Cascão **não estão no repositório GitHub**. O workflow gera somente `LUCIANE_COMERCIAL_V4_3_BASE_SEM_FOTOS_CASCAO.zip` e NÃO deve ser publicado. O pacote final só existe depois de executar `scripts/finish-cascao-v43-cloudflare.py` com as três fotos originais, obtendo `LUCIANE_COMERCIAL_V4_3_CASCAO_NATAL.zip`. Conferir a presença dos 9 arquivos e o hash do ZIP final.

## Banco / ativação
- Migração `20261112074500_cascao_trufado_tres_sabores.sql`: renomeia **somente** o campo `name` da categoria, preservando status; insere os 3 novos SKUs **hidden**, sem tocar nos 3 anteriores nem na coleção Natal. Executar antes de liberar os sabores no admin.
- Os novos SKUs só podem ser vendidos quando estiverem **Disponível** no painel, categoria ativa, frontend com imagens e backend atualizado.
- A categoria e os 3 sabores antigos já estavam `available` no Supabase em 12/11; Natal e 4 fatias também. **Nunca** implantar o backend com preços novos enquanto a vitrine antiga ainda aceita pedidos dos chocotones a preços antigos: o cliente pode ver um valor e receber outro.
- **Janela coordenada de publicação:** preferir ocultar temporariamente as categorias Cascão e Natal no painel, esperar pedidos em andamento terminarem, aplicar migração, implantar a nova versão da Edge Function `create-whatsapp-order` e conferir a versão, publicar o ZIP V4.3 no Cloudflare, validar preços e fotos no iPhone e reabrir as categorias e os 3 novos sabores conforme estoque confirmado pela Luciane. Evitar ativar novos SKUs antes do upload.
- **Não** executar `create-order`, não alterar pagamento online, QZ/impressora, Pix, taxas, refrigerantes, estoque, gestão ou dados históricos.
- Em rollback, ocultar novos SKUs e Natal, restaurar frontend anterior e Edge compatível antes de reabrir preços antigos; não apagar pedidos já registrados.

## Validações obrigatórias
- CI no SHA final: build, suite de testes comerciais, WebKit 320/375/390/430/1280 e QA de catálogo. Validar cotação de 6 cascões e 4 chocotones; somas em pedidos mistos.
- No ZIP final: 9 fotos novas, 8 fotos Natal intactas, todos os arquivos anteriores, rotas `index.html`, `admin/index.html`, `pedido/index.html` e `_worker.js`; ausência de arquivos sensíveis.
- Em Safari/Instagram, verificar foto, preço R$20/R$22, seletor, quantidade, carrinho, mensagem Tintim, pedido único e recebimento no WhatsApp; não confundir registro com envio.
- O deploy Cloudflare é manual; testes automatizados não comprovam envio efetivo de WhatsApp.
