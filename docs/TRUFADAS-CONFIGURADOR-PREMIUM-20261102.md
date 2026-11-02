# Pipocas Trufadas — configurador premium guiado (02/11/2026)

## Escopo recebido
O vídeo da jornada inteira confirma que o cabeçalho superior da categoria é compartilhado com Gourmet e Fatias. Não alterar esse cabeçalho, a vitrine inicial ou as outras categorias. Melhorar exclusivamente o configurador mostrado depois de abrir Trufadas.

## Origem e isolamento
- Repositório: `railanzera-cloud/luciane-oliveira-doces-site`.
- Base: `work/vitrine-premium-refino-equilibrio-20261102`, `9db42e65fa189353de83cc8df9bc7c7fa576976d`.
- Branch candidata: `work/trufadas-configurador-premium-20261102`.
- Sem alteração em `main`, em Supabase comercial, Cloudflare ou no projeto Gestão.
- Versão publicada precisa de comprovação independente; CI e ZIP não provam deployment.
- Preservar o hotfix `create-whatsapp-order` v25 externo ao Cloudflare, documentado em `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md`.

## Modificações de experiência
- Substituição do cabeçalho interno repetido por navegação visual de progresso: Sabor / Tamanho / Quantidade.
- Mantidos os três cartões com fotografias reais já aprovadas e a grade P/M/G.
- Seleção mais expressiva e tátil, com hover apenas em apontadores finos, estados de clique e foco visível; sem animações contínuas; respeita `prefers-reduced-motion`.
- Removidos lembretes de escolha e a barra intermediária de preço, que repetiam textos e valores.
- Quantidade mantém subtotal, controles e inclusão no carrinho. CTA e barra flutuante usam a mesma legenda contextual.
- Estado de loja fechada passa a dizer "Pedidos pausados" em vez de "Tamanho esgotado"; demais estados distinguem indisponibilidade de consulta, escolha incompleta, quantidade e saldo efetivamente insuficiente.
- Rótulo "Em estoque" distingue estoque de capacidade de comprar; observação de saldo só aparece com loja aberta e estoque consultado.
- Recomendações externas usam "Conheça também" antes de haver carrinho e "Complete seu pedido" apenas após adicionar item.

## Contratos intocados
- Identidade, cabeçalho de todas as categorias e vitrine inicial.
- Nove combinações por sabor e tamanho P/M/G, preço exato de cada SKU, fotos, IDs legados.
- Disponibilidade remota, concorrência, reserva e revalidação antes do carrinho.
- UTMs, histórico, navegação, Meta/Tintim, WhatsApp, checkout, Mercado Pago, QZ/ESC-POS, admin e Auth.
- Nenhuma alteração SQL, migração ou function deploy.

## Validação requerida
- `npm run build`, `npx tsc --noEmit`, `node --test tests/*.test.mjs`, empacotamento e integridade na CI vinculada ao HEAD final.
- Testes específicos `tests/trufadas-configurador-premium-20261102.test.mjs` mais regressões já existentes, incluindo `tests/trufadas-premium-hierarquia-20261018.test.mjs`.
- Verificação manual de viewport 320/375/390/430 e desktop, Safari no iPhone físico (pendente), navegador interno Instagram (pendente), loja aberta/fechada, seleção de sabores, estoque, carrinho e retorno.
- Não fazer pedidos reais sintéticos para homologar a UI.

## Portões de publicação
Publicação Cloudflare e merge em main permanecem não autorizados por esta intervenção. Para publicar, confirmar deployment corrente, preservar os ajustes de banco e Edge Function já presentes, baixar somente o artefato de CI do SHA desta branch após sucesso e executar o checklist real de navegação/compra. Não reimplantar a Edge Function v24.
