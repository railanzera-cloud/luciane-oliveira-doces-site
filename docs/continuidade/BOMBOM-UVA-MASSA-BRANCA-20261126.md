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

## Atualização de escopo — 26/11: integração comercial antecipada
Após a orientação do proprietário de preparar toda a estrutura antes da foto, o cadastro deixa de ser apenas `SLICE_DRAFTS` e passa a ser um produto normal em `PRODUCTS`/`SLICES`, com preço R$22, variante fatia, caldas existentes, item_key próprio e cotação no catálogo de servidor. O painel de pedidos e a comanda utilizam os campos do snapshot do item, sem novo mecanismo especial. O controle de disponibilidade identifica a ausência de imagem e mantém o item oculto no fallback **e** no merge remoto, com controles de ativação desabilitados no /admin e indicação de foto pendente. Nenhuma imagem foi inventada. A futura adição do caminho real de imagem elimina o bloqueio local de preparação, mas mantém a necessidade de status remoto explicitamente disponível para vender. O cadastro no banco deve iniciar hidden, e o backend produtivo deve receber somente a nova entrada, preservando diferenças preexistentes em relação ao Git. O peso segue a configuração geral das fatias na candidata, sujeito à confirmação comercial antes de liberar. O release continua separado: não publicar esta candidata sem foto nem habilitar a disponibilidade. Não reescrever os registros históricos acima.

## Foto recebida e aceite de liberação administrativa — 26/11
Proprietário enviou a imagem real aprovada e pediu explicitamente manter a nova fatia **não disponível**, mas apta para Luciane liberar pelo painel, pois há produto hoje. Caminho exclusivo `/fatia-bombom-uva-massa-branca-20261126.webp`, foto original preservada em enquadramento e cor, otimização WebP local. A mídia precisa ser acoplada ao ZIP final fora do GitHub (limitação de transferência binária da sessão); o core sem esta mídia é **NÃO PUBLICAR**. O fallback continua hidden; após publicação da versão completa o status remoto hidden pode ser alterado pelo operador autorizado. Cadastro Supabase hidden confirmado. A expectativa de regressão histórica de SKUs foi ampliada exclusivamente para a nova fatia independente, sem modificar o snapshot v14 ou a verificação de preços históricos. Sem ativação automática ou alteração de outros produtos.
