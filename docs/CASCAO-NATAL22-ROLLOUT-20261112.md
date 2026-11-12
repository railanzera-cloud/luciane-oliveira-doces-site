# Cascão Trufado + Natal R$22 — implementação comercial candidata (12/11/2026)

> Status: código em branch isolada. **Não é produção**. Não publicar frontend antes da sincronização da Edge `create-whatsapp-order` e da migração das linhas de disponibilidade.

## Solicitação aprovada
- Categoria **Cascão Trufado** (identidade comercial), mantendo o ID técnico `cones`, o tipo interno `cone`, os IDs dos três produtos antigos e os preços **Prestígio R$14; Dois Amores R$14; Ferrero Rocher R$16**.
- Três novos SKUs `unidade`, sem opções extras e com fotos fornecidas pelo proprietário: `cascao-trufado-kinder-bueno` (**Kinder Bueno**), `cascao-trufado-ninho-morango` (**Ninho com Morango**) e `cascao-trufado-ninho-nutella-chocotone` (**Ninho com Nutella e Chocotone**), **R$20 cada**.
- Os quatro SKUs de **Fatias de Chocottone** (Casadinho, Ferrero Rocher, Ninho com Nutella, Morango com Brigadeiro Branco e Chocolate) passam de R$16,99/R$18,99 para **R$22 cada**, sem alterar seus IDs, fotos, sazonalidade ou quantidade livre.

## Paridade / IDs
- `app/catalog.ts`: preço visual e imagens.
- `supabase/functions/_shared/commerce-catalog.mjs`: preço autoritativo em centavos `2000/2200`, SKUs válidos e nomes na comanda. **Requer deploy da Edge `create-whatsapp-order`; não basta Cloudflare.**
- `app/menu-availability.ts`: novos códigos `cascao_kinder_bueno`, `cascao_ninho_morango`, `cascao_ninho_nutella_chocotone`; sua ausência remota ou status `hidden` bloqueia a venda. `supabase/migrations/20261112103000_cascao_trufado_novos_sabores.sql` insere os três como **hidden** e muda apenas o nome da categoria, sem reabrir estoques.
- Painel `/admin` herda os novos controles individuais pelo catálogo de disponibilidade. A grade de sabores é **2 colunas até 599px**, sem o último cartão se expandir quando o total é par.
- Nenhuma mudança na distribuição dos componentes da home, em refrigerantes, cobrança, frete, checkout WhatsApp, impressão, estoque anterior ou outros produtos.

## Fotografias reais aprovadas: origem e hash
Os arquivos enviados nesta sessão são três JPEGs intactos (1122×1402). Foram criadas **duas versões WebP de cada imagem por redimensionamento/recorte técnico**, sem retoque, alteração de brilho, ingredientes ou geração de conteúdo: cartão 640×480, detalhe inteiro 900×1125. Binários não entram em GitHub: devem estar no **ZIP Cloudflare final**, após o build conectado, e ser recuperados do ZIP final para futuros incrementos.

| Origem | SHA-256 JPEG original | WebP detalhe (SHA-256) | WebP cartão (SHA-256) |
|---|---|---|---|
| Kinder Bueno | `fa639ae45e5a4f0fb954368140ac11ddadc3365ab7778cccbae0bd0b3e73ce25` | `37b6451d92e89c45c62bbb5a25adae00493022258fa81f5968c04b7a67ac507a` | `fc60b4bdf6b9293e83e937da0fb5f9f9668072fb0a5134bb054e4b705be0f9fa` |
| Ninho com Morango | `6f50d502edeacf4b400ea1f6ef7bd49fc3d4548c1625b6bcb04c788bd2d063df` | `bd6e28d669d3bf2612d6c0a13bb5d576fb66974a24a5031459ba631ccafd6e75` | `fec42580e60e657d399130f1d5497513dd248070228ab692e96a65dc8baa9397` |
| Ninho com Nutella e Chocotone | `45391c0ec15dbae3872d7b67d15307e2e72e17a94215a89edafdd47304212c22` | `747553e2e909810c00324b7c52e2a94c29ce892c4fc073da34e3589064c9c1d7` | `1a7ad2cd9118097165055f81b6d65359cca0a4128cbe5a24af664c111391b44d` |

Caminhos: `images/cascao-<slug>-detail-20261112.webp` e `images/cascao-<slug>-card-20261112.webp`, com slugs `kinder-bueno`, `ninho-morango`, `ninho-nutella-chocotone`.

## Ordem de liberação segura (não executada automaticamente)
1. Confirmar deployment anterior e backup/rollback do ZIP, SQL e código da Edge. Fazer cutover em período com pedidos pausados, principalmente porque o preço de Natal mudou de uma versão para outra.
2. Aplicar a migração de novos itens **hidden**, sem alterar o estado de outros registros. Verificar três linhas individualmente.
3. Compilar e implantar `create-whatsapp-order` a partir do código candidato compatível, incluindo dependências importadas, com controle de versão/rollback. **Não redeploy de uma versão antiga.** Verificar cotação servidor para sete SKUs e recusa de preço obsoleto.
4. Publicar no Cloudflare **apenas o ZIP final com 6 WebPs novos + 8 natalinos originais**. Validar que a home, o painel, pedidos e checkout exibem R$22 no Natal e R$20 em cada Cascão novo.
5. Quando tudo estiver sincronizado e produtos de fato disponíveis, liberar conscientemente cada `cascao_*` no `/admin`. Não inferir disponibilidade física.
6. Testar Safari físico e Instagram, inclusão de seis sabores, subtotal, 4 fatias × R$22 = R$88, item misto, WhatsApp, status, QZ, mensagens e atribuição Tintim. Sem pedido real desnecessário.

**Limite técnico:** o frontend com R$22 antes de atualizar a Edge pode causar rejeição `price_changed`. A Edge com R$22 antes de publicar o frontend antigo pode causar a mesma divergência. Coordenar cutover, não publicar em partes sem operação pausada.
