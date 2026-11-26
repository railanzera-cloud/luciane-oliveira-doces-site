# Pré-cadastro — Bombom de Uva na Massa Branca (26/11/2026)

## Origem e decisão
Em mensagem da proprietária encaminhada pelo proprietário do sistema: **“Bombom de uva na massa branca R$22,00”** e **“A foto da fatia te envio assim quando cortar”**.

Interpretar como **outro sabor / outra apresentação**, não como renomeação nem substituição do Bombom de Uva existente (massa de chocolate), que permanece com seu SKU, sua foto aprovada e R$22.

## Pré-cadastro técnico seguro (não publicado)
- Nome comercial: **Bombom de Uva na Massa Branca**.
- Preço informado: **R$22,00 por fatia**.
- ID de futura compra reservado: `fatia-bombom-uva-massa-branca`.
- `item_key` reservado: `slice_bombom_uva_massa_branca`.
- Fonte da imagem: **aguardar foto real da fatia cortada enviada por Luciane**; não reutilizar imagem do Bombom anterior nem gerar imagem sintética.
- Estado no código: apenas `SLICE_DRAFTS` com `image:null`, `price:22`; a tipagem `isDraft` serve à visão administrativa, e o mecanismo `mergeRemoteAvailability` força todo rascunho a `hidden`, mesmo sob status remoto conflitante.
- Não está em `PRODUCTS`/`SLICES`, no mapa `SLICE_ITEM_KEYS`, nem no catálogo autoritativo da Edge. Não pode ser cotado, enviado, vendido nem impresso a partir do frontend novo.
- Não há entrada de banco nova, Edge deploy, modificação de estoque, publicação Cloudflare, migração aplicada, ativação de produtos ou mensagens comerciais.

## Requisitos antes de liberar a venda
1. Receber e conferir a fotografia original da fatia real. Preparar fotografia principal/card nos formatos aprovados sem alterar aparência do alimento.
2. Confirmar que o novo produto segue o contrato de caldas e peso das Fatias Artesanais; o peso histórico de 380 g não é comprovação do novo sabor.
3. Promover de `SLICE_DRAFTS` para `PRODUCTS`/`SLICES` com ID e itemKey reservados, preço R$22 e foto correta.
4. Criar o cadastro de disponibilidade no Supabase **oculto por padrão** (mediante autorização produtiva). Atualizar `SLICE_ITEM_KEYS`, disponibilidade e o catálogo da função `create-whatsapp-order` de modo coordenado, com backup fresco e rollback.
5. Executar regressões de seleção, caldas, quantidade, carrinho, cotação autoritativa, IDs/centavos, mensagens WhatsApp, admin/cozinha; validar visual em mobile/Safari e preservar todas as mídias.
6. Gerar pacote completo fiel ao código, verificar manifesto, arquivos e fotos, obter autorização e realizar publicação manual com identificação do deployment no Cloudflare. Somente após validação operacional, disponibilizar o sabor no painel se houver estoque.

## Base e isolamento
Branch base: PR #75, commit `f260d9db546352a21805205d7ca976d115dd7f1f`, versão V4.7.15.9. PR #67 CRM não foi incorporado. Não modificar o Bombom de Uva existente, outras Fatias, bebidas, Natal, pagamentos, Pixel/CAPI, impressão ou automações.

**Estado:** apenas desenvolvimento preparado, aguardando fotografia e validação. Nenhum release/produção comprovado desta nova opção.
