# Luciane Oliveira Doces — atualização de 14/09/2026

## Informações adicionadas

- 380 g por fatia em todas as opções de fatias e nos itens correspondentes do carrinho.
- “Preparo e entrega: em média, 15 a 20 minutos.” na entrada do cardápio (com pedidos abertos e categoria visível) e na etapa de entrega. A média inclui preparo, chamada do motoboy e chegada ao cliente, conforme o usuário. Não foi criado prazo específico para retirada.
- Identidade, catálogo comercial, preços, fotos, disponibilidade, integrações e fluxos preservados.

Arquivos de implementação alterados: app/catalog.ts, app/page.tsx, app/globals.css.

## Verificação desta execução

Build aprovado; lint sem erros, com cinco avisos img existentes. Suítes já aprovadas não repetidas por rotina. Conferência visual em iPhone real pendente. Consulta real do pedido 1001: continua pending/payment_pending, paid_at null.

## Ponto de parada dos pagamentos

Railan confirmou em 14/09 que ainda NÃO realizou com Luciane a conferência da assinatura da aplicação Mercado Pago e MP_WEBHOOK_SECRET_TEST. Pagamentos pausados nesse passo manual. O último diagnóstico confirmado das reentregas foi SignatureMismatch. Não repetir migrations, RLS, seeds, criação do pedido 1001 nem deploy das correções já confirmadas. Nada publicado no Cloudflare ou no espelho Sites.

Ainda faltam Pix integrado até paid, cartão aprovado/recusado/retentativa, deduplicação integrada, painel/Realtime, acompanhamento visual e Purchase server-side. Impressão/QZ fora desta execução.

## Mensagens exatamente conforme o código atual

A mensagem compacta e a mensagem de finalização pelo WhatsApp são fluxos distintos; não foi feita unificação nesta rodada. Os exemplos abaixo usam um pedido fictício de uma fatia Prestígio de R$20 com retirada.

### Pedido criado pelo site — botão Falar com a loja

```text
Olá! Já fiz o pedido #1001 pelo site e preciso de ajuda.
```

O número é dinâmico. Esse botão de suporte usa Tintim. A mensagem atual NÃO afirma pagamento aprovado e NÃO contém link de acompanhamento; o acompanhamento é exibido na página do pedido. Ela não é disparada automaticamente, depende de o cliente abrir o WhatsApp e enviar.

### Finalização pelo WhatsApp — pix

```text
Olá! Finalizei meu pedido pelo cardápio da *Luciane Oliveira Doces*.

*PEDIDO LOD-EXEMPLO*

*1. Prestígio — 1 fatia*
R$ 20,00

*RECEBIMENTO*
Retirada
Cidade: Paragominas

*PAGAMENTO*
Pix

*RESUMO*
Produtos: R$ 20,00
Taxa de entrega: não se aplica
*Total: R$ 20,00*

*PRÓXIMO PASSO — PAGAMENTO PIX*

Valor a pagar: *R$ 20,00*

*Chave Pix (CPF)*
03611974200

Titular: Luciane Galvão de Oliveira

Faça o pagamento e envie o comprovante nesta conversa.
```

### Finalização pelo WhatsApp — cartao

```text
Olá! Finalizei meu pedido pelo cardápio da *Luciane Oliveira Doces*.

*PEDIDO LOD-EXEMPLO*

*1. Prestígio — 1 fatia*
R$ 20,00

*RECEBIMENTO*
Retirada
Cidade: Paragominas

*PAGAMENTO*
Cartão na retirada

*RESUMO*
Produtos: R$ 20,00
Taxa de entrega: não se aplica
*Total: R$ 20,00*

O pagamento será realizado no cartão no momento da retirada.

Aguarde a confirmação do pedido antes de se deslocar.
```

### Finalização pelo WhatsApp — dinheiro

```text
Olá! Finalizei meu pedido pelo cardápio da *Luciane Oliveira Doces*.

*PEDIDO LOD-EXEMPLO*

*1. Prestígio — 1 fatia*
R$ 20,00

*RECEBIMENTO*
Retirada
Cidade: Paragominas

*PAGAMENTO*
Dinheiro
Não precisa de troco.

*RESUMO*
Produtos: R$ 20,00
Taxa de entrega: não se aplica
*Total: R$ 20,00*

O pagamento será realizado em dinheiro no momento da retirada.
```

Os exemplos completos foram gerados pela própria função buildOrderMessage, sem alterar sua lógica. No fluxo WhatsApp a mensagem permanece completa para fornecer os dados necessários ao atendimento; ela não foi substituída pelo texto de suporte.
