# Home — último pedido ativo (30/09/2026)

Base: 253af116267e8919ccf6310fca9c653b090bac21, árvore limpa antes da alteração.

A home consulta o endpoint público existente com o token já salvo no dispositivo. Mostra número real e link somente para payment_pending, new, confirmed, preparing, ready, ready_for_pickup e out_for_delivery. completed/cancelled ocultam o bloco e removem somente a referência local correspondente. Nenhum pedido ou token no banco é alterado; links individuais continuam válidos.

A validação ocorre ao abrir, retornar à página (pageshow/focus/visibility), mudar a referência em outra aba e a cada 60 segundos enquanto visível. Consultas concorrentes são agrupadas. Uma resposta antiga não remove a referência de um pedido mais novo. Falhas de rede ocultam o bloco sem apagar o token. Não foi inventado prazo de expiração para pedidos ainda ativos.

O contêiner inteiro só é renderizado com pedido ativo validado, sem espaço de carregamento reservado. O card tem quebra de linha, área de toque mínima de 48px e foco visível, sem animações. A home já distingue fechamento geral por ordersOpen (mensagem existente) de estoque por isItemAvailable; essa apresentação foi preservada.

## Validação

- `node --test tests/home-last-order.test.mjs tests/menu-refinement.test.mjs`: 72 testes passaram.
- Cobertura nova: ausência de referência, sete estados ativos, cancelamento/conclusão, reabertura, resposta antiga versus token novo, erro de rede, status desconhecido, link exato, ausência de contêiner vazio, atualização/resume/storage, deduplicação e limpeza dos listeners.
- Suíte existente: navegação de categorias, disponibilidade/fechamento e fluxo de personalização/carrinho/checkout preservados.
- `npm run package:cloudflare:production`: build e ZIP comercial aprovados.
- Safari/iPhone e navegador interno do Instagram não foram executados neste ambiente. Responsividade usa CSS flex com quebra de linha; a verificação visual real fica para Preview.

## Homologação em Preview

1. Enviar o novo ZIP a um Cloudflare Preview, mantendo o site publicado atual.
2. No mesmo navegador do Preview, sem pedido salvo, conferir ausência do bloco e do espaço reservado.
3. Usar um pedido de teste ativo criado no Preview: voltar à home e conferir número, layout a 320–390px e abertura do acompanhamento.
4. Concluir/cancelar esse pedido pelo fluxo administrativo normal: retornar à home ou aguardar até 60s com ela visível. O bloco deve desaparecer. Abrir a URL individual original: o acompanhamento deve continuar acessível.
5. Criar novo pedido de teste; conferir substituição. Repetir retorno/reabertura no Safari e no navegador interno do Instagram. Cada navegador/origem tem seu próprio armazenamento; um pedido salvo no Safari não aparece automaticamente no Instagram ou em outro domínio Preview.
6. Conferir acesso às categorias e comportamento normal do carrinho. Publicar em produção apenas após aprovação.

Nenhuma atualização de backend, migration ou Function é necessária. Nenhum deploy, push ou alteração remota foi realizado.
