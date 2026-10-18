# Comanda premium: confirmar o pedido sem exigir pagamento

## Esclarecimento operacional da Luciane (17/10/2026)
A operadora quer receber automaticamente a comanda quando o cliente **finaliza o pedido no site com checkout WhatsApp**. A confirmação financeira ocorre no WhatsApp, depois de a cozinha receber a comanda e antes da entrega. Pedidos eventuais não pagos podem ser descartados fisicamente; não exigem clique manual de aceite, nem confirmação de Pix para imprimir.

## Código e comportamento
- Base: `work/etiqueta-premium-restaurada-cozinha-20261017`, checkpoint `71db54f97c74c11f3487d73be958d7c526cd1c58`.
- Branch: `work/etiqueta-premium-confirmacao-pedido-20261017`.
- O backend instalado **já** implementa aceitação automática de novos pedidos WhatsApp elegíveis `order_status='new'` para `confirmed` quando **Modo Cozinha** e **fila** estão ligados. Esse fluxo independe de `payment_status='paid'` para Pix manual, dinheiro e cartão na entrega. Não requer alteração de banco.
- No layout de etiqueta histórica premium, se `payment_status='paid'` mostra `PIX CONFIRMADO` ou forma de pagamento aprovada; se não está pago mas foi aceito, mostra **PEDIDO CONFIRMADO**. É a confirmação do *pedido*, não do Pix. O sistema NÃO altera `payment_status`, `paid_at` ou faturamento.
- Os pedidos ainda `payment_pending` do Mercado Pago permanecem sujeitos às regras de pagamento do checkout; somente pedidos efetivamente registrados como novos no fluxo WhatsApp podem entrar diretamente em impressão pendente. Pedidos cancelados/estornados não podem ser enviados.
- Preserva todo o visual premium do pedido #1279: número e nome ampliados, endereço, recheios, data local, observações, total.
- A impressora é operada pelo notebook Windows/QZ Tray; para dispensar a permissão manual do QZ é necessária a confiança correta do certificado, mesmo com callbacks corrigidos. Não configurar permissões anônimas irrestritas.

## Implantação e teste
1. Um único ZIP Cloudflare Pages. Não publicar automaticamente.
2. Com a Luciane: conectar o QZ Tray, verificar que a impressora POS-58 está selecionada e habilitar o som.
3. Após autorização válida do QZ, habilitar Modo Cozinha uma única vez. **Permanece desligado no banco até a operadora ligar**.
4. Teste autorizado: criar pedido WhatsApp com Pix manual ainda pendente, confirmar que aparece no painel como **confirmed**, que gera exatamente uma comanda com **PEDIDO CONFIRMADO** e itens completos, sem alterar a situação de pagamento. Depois desativar modo se não desejar novos testes.
5. Conferir um pedido pago: somente este deve exibir **PIX CONFIRMADO**. Se não houver confirmação financeira, não transformar o comprovante em recibo de pagamento.
6. Não criar, excluir ou atualizar pedidos de clientes reais durante testes de infraestrutura, sem combinar com a operadora.

## Rollback e proteção
- Para interromper automaticamente, clicar `Desligar automático` no painel. Nenhum pedido é automaticamente marcado como pago.
- Este checkpoint muda somente texto da etiqueta e testes de regressão; não reaplica migrations nem mexe em estoque, catálogo, campanhas ou backend de pagamentos.
