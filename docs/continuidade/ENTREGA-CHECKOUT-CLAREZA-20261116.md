# Checkout mais claro — V4.7.15 (16/11/2026)

Incremento autorizado após análise de quadros da gravação de 5min12 fornecida pelo proprietário. Implementação candidata testada; a aprovação do escopo não equivale à homologação estética final nem à publicação.

## Resultado

- Total final em champagne claro sobre o fundo chocolate. A regra específica `.summary-row strong` sobrescrevia a cor clara anterior; a correção permanece limitada a `.summary-total strong` no checkout.
- Barra fixa mostra **Ver pedido** com o valor ao navegar na vitrine. A entrada no checkout preenchido mantém a finalização direta pelo WhatsApp; consultar o pedido não cria registro, mensagem ou evento de compra. Montagem de produtos mantém suas próprias ações e a barra não duplica o botão final visível.
- Carrinho tem miniaturas compactas, especificações sem badges volumosos e quantidade mostrada no controle. Preços, sabores, calda, tamanho, quantidade, editar, remover e avisos de indisponibilidade continuam disponíveis. Controles mantêm pelo menos 44px de altura.
- Todas as sugestões elegíveis continuam visíveis. Linhas mais curtas e menor espaçamento reduzem sua altura. Refrigerantes continuam opcionais, recolhidos inicialmente e sem rolagem por alteração de quantidade.

## Base e história recuperada

- Branch: `refine/checkout-clareza-carrinho-20261116`; PR #68, em rascunho, sobre PR #66 `fix/cozinha-pos58-contingencia-manual-20261115` (`2f47d9b2e398aefba62179c3e3beb1bf066fd0c3`).
- Fonte funcional compilada e testada: `a0c594a1131018b43e5a07b71f74789d4e304e7b`. Commit posterior de documentação/receita não modifica o frontend compilado.
- Home publicada observada em 16/11: `/assets/page-TzR6Ytob.js`, idêntica byte a byte à compilação da vitrine do ancestral PR #65 e também preservada no PR #66. O módulo administrativo publicado `/assets/page-fk5ytJ-n.js` tem conteúdo igual ao PR #66 após normalizar somente nomes de dependências compiladas; o PR #65 difere funcionalmente. Por isso a base foi ajustada ao PR #66 para preservar contingência POS-58 e QZ.
- PR #67 permanece paralelo. Não houve merge de automação nem deploy de backend por este incremento.
- Recuperado o ZIP `LODC_SITE_V4_7_13_CAPA_CASCAO_APROVADA.zip`, SHA256 `43c0edfbecfdab3bc670900db8143e59f2259270db3e7e70be9c8777e73e936f`, como fonte de mídia histórica, sem utilizar seu código como base atual. Nove mídias ausentes nele foram recuperadas por leitura HTTP do domínio oficial. Os 26 recursos aprovados necessários ao frontend que ainda estavam fora desta linha Git agora estão versionados com os mesmos bytes.

## Validação

- Build local e GitHub aprovados; **931 testes comerciais aprovados**.
- WebKit automatizado: 320/375/390/430/1280px, carrinho misto, revisão sem registrar compra, edição, alterações de quantidade reversíveis, cinco complementos, bebidas, ausência de overflow e alvos de toque. Duas execuções aprovadas do workflow dedicado: `43996751608` e `43996882549`.
- Workflows de catálogo `43996882615`, CRM `43996882567`, identidade `43996882495` e entrega/bairros `43996882422` aprovados no candidato. Não são comprovantes de operação física.
- Prévia Chrome isolada com disponibilidade sintética e integrações bloqueadas: confirmou Ver pedido na vitrine, envio no checkout e contraste do total. Em uma amostra de um Cascão a 375px úteis, altura do cartão passou de aproximadamente 308px para 187px. Essa medida não representa todos os itens/telas nem prova ganho de conversão.
- TypeScript geral continua com quatro erros nas mesmas linhas de `components/admin-trufadas-stock.tsx`, `db/index.ts` e `worker/index.ts`; reproduzidos na base PR #66. Nenhum erro novo deste incremento.
- ZIP: CRC, ausência de paths duplicados, parsing de todos os JS, sete páginas, manifesto e 69 referências locais conferidos. Mídias da base preservadas byte a byte; nenhuma imagem foi regenerada.

## Artefato

`LUCIANE_DOCES_V4_7_15_CHECKOUT_CLAREZA_CLOUDFLARE.zip`

- SHA256: `d7b008cc7d9fcfbcb5dc51d3e36a6b400043bdd1d20d33db3ff0f85b3904dc5e`
- 182 arquivos reais; 151 arquivos de mídia/fontes; `RELEASE-MANIFEST.json` com hash e tamanho por arquivo.
- Receita: build conectado da fonte funcional; `node --env-file=.env.local scripts/build-crm-commercial-core.mjs`; `node scripts/package-checkout-clarity-20261116.mjs /caminho/LODC_SITE_V4_7_13_CAPA_CASCAO_APROVADA.zip`. O arquivo intermediário de core continua NÃO PUBLICÁVEL. Somente o ZIP final reconciliado contém a mídia completa e as verificações finais.

## Publicação e reversão

Estado: desenvolvido e testado, integrado à base de cozinha em branch própria, ZIP pronto. **Não publicado no Cloudflare, não mesclado à main, sem SQL/Edge/estoque/mensagens/pagamentos reais alterados.** ID do deployment Cloudflare atual não foi obtido. Uma tentativa posterior de comparação HTTP dos dois domínios retornou 403 neste ambiente; não comprova falha pública nem paridade. A observação anterior dos assets permanece datada.

Para publicar manualmente: registrar o ID da implantação de produção anterior no painel Pages; carregar o ZIP final; aguardar Success; registrar novo ID/data; conferir `.com.br` e `.pages.dev`, `/admin`, as fotos dos seis Cascões, edição/quantidades/total e a troca contextual do botão em iPhone Safari e Instagram. Nenhuma alteração de Supabase é necessária para este ajuste. Envio efetivo de WhatsApp e recebimento operacional exigem homologação própria com a operação.

Reversão: usar **Rollback** para a implantação anterior identificada no painel. O ZIP histórico de mídia não é rollback do frontend atual. Para reversão de código, retirar somente o incremento do PR #68 sobre a base do PR #66; preservar as correções de cozinha. Não limpar cache de toda a zona como rotina.
