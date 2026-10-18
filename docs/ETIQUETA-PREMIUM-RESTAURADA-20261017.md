# Etiqueta de cozinha 58 mm — restauração exata do design histórico

## Pedido da operação
A impressão atual de pedidos #1310/#1311 usa modelo simplificado. A referência visual aprovada anteriormente é o **pedido #1279 de 17/10/2026 às 11h17**: cabeçalho organizado, número de pedido grande, data/hora local, ENTREGA + PIX CONFIRMADO, produto em negrito com sabores individuais, CLIENTE com nome ampliado, endereço rotulado e total em negrito.

## Proveniência do código
- Encontrado o renderer original em `lib/qz-print-client.ts`, branch `work/crocantes-estoque-20261016`, blob `c6cc5ce2d4225ad528ece4362f6e97ceb7d5569f`.
- Base atual é a branch `work/cozinha-completa-qz-assinado-20261017`, checkpoint `7adb2b88c0b337fa42833254dce90c50b4cab9e1`.
- Transplantado **somente** o renderer `receipt()`, função de quebra de linha `wrap()` e `money()` do código antigo. Ajustado `paymentLine()` para restaurar "PIX CONFIRMADO" quando de fato pago, sem perder avisos atuais "PIX PENDENTE - CONFERIR" e outros pagamentos pendentes.
- Retomado `encoding: "ISO-8859-1"` original da POS-58 com comandos ESC/POS; textos sanitizados para ASCII.
- Mantidos: cabeçalho/ID do pedido com ampliação ESC/POS, centro/negrito, data e hora `America/Belem`, etiqueta de REIMPRESSAO, opções de fatias, endereço por campos, nome ampliado com quebra a 16 colunas, observações, troco e total.
- Telefone ausente é exibido como "Telefone: nao informado", em vez de "null".
- O renderer do número e nome usa `\x1D\x21\x11` e depois restaura modo normal.

## Escopo preservado
- O código de assinatura do QZ Tray, QZ certificate callbacks, fluxos da cozinha, alertas, Supabase, filas/regras de impressão, aceitação opt-in, pedidos, pagamentos, estoques, vitrine e resultados permanecem exatamente da revisão mais recente; somente o layout é restaurado.
- Não houve mudança no estado do banco. O modo automático permanece desligado até a operadora ativá-lo no painel.
- A restauração não muda a certeza de pagamento ou criação dos pedidos. Fila e job tokens continuam geridos pelas mesmas RPCs.
- Publicação Cloudflare ainda depende de autorização: gerar ZIP de CI e publicar manualmente.

## Testes físicos recomendados
Após implantar o ZIP, com QZ autorizado, **não criar pedidos comerciais para teste sem combinar antes**. Usar um pedido real autorizado e comparar com foto da etiqueta #1279: número maior, nome maior, data completa, produto e sabores, endereço completo, pagamento correto, total e papel 58 mm. Confirmar que o aviso de PIX pendente não virou PIX CONFIRMADO. Conferir largura e corte do papel em nomes longos. Para evitar emissão dupla, não acionar reimpressão de um pedido que já saiu sem conferir a fila física.
