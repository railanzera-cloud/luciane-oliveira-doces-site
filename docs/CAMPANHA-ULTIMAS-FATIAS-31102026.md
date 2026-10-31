# Campanha últimas fatias 31/10 — refinamento mobile e clareza

**Revisão da gravação do iPhone de 31/10, 18h06:** a primeira versão criava uma peça grande, repetia sabores e preços nos botões acima das fotos e exigia muita rolagem para alcançar o produto. O objetivo foi reduzir a leitura antes da escolha.

## Entrega refinada
- Faixa **compacta** acima dos cards: "ÚLTIMAS FATIAS DE HOJE", "Ainda dá tempo de garantir a sua.", nomes dos sabores e pedido para **escolher a fatia na foto logo abaixo**. Horário "Até 20h · enquanto houver".
- Removidos botões e preços duplicados do banner. Os **cartões reais** continuam como única seleção: fotografia grande, nome, preço e indicador de selecionado; toque leva diretamente à escolha da calda com preview.
- Selo discreto **"Últimas de hoje" sobre as fotografias** dos dois sabores disponíveis, sem adicionar linha vertical ao card. Priorização de carregamento dessas duas fotos em campanha.
- Layout com chocolate/cobre, contraste e tipografia responsiva, sem pop-up, falsa prova social, contagem inventada, desconto inexistente, reimpressão de pedidos ou checkout extra.
- Não altera configuração de pagamento, WhatsApp, Meta, Tintim, Supabase, cozinha, impressora, CRM ou estoque.
- Condições preservadas: somente `31/10/2026`, antes das **20h em America/Belem**, na categoria Fatias, com a loja aberta e retorno de disponibilidade real; quando um sabor marcar `sold_out`, o selo não aparece para ele. Nenhuma alteração em `orders_open` às 20h.
- Quantidades iniciais informadas: **5 Chocolate com Morango e 5 Prestígio** por volta de 17h54; não são apresentadas como contador ao vivo (estoque manual). Operadora deve marcar produto esgotado em Disponibilidade ao vender o último.

## Link de campanha
O próprio roteador do site reconhece o parâmetro `?categoria=fatias`. URL de entrada para os anúncios de fatias:
`https://lucianeoliveiradoces.pages.dev/?categoria=fatias`
**Preservar todos os UTMs existentes** ao acrescentar `categoria=fatias`. Não redirecionar anúncios de pipocas nem links gerais de produtos de forma indiscriminada.

## Segurança de publicação
Base exclusiva do último ZIP de 31/10: `feature/ultimas-fatias-31102026` @ `e80554694979a105bcde874f9cfda9180a19ecc7`. Não incluir modificações não publicadas da branch `fix/cozinha-reimpressao-e-diagnostico-20261031`. Sem deploy automático de Cloudflare, sem merge em main; pacote final após build, TypeScript e testes. Não presumir que pacote aplicado aumenta conversão sem observar pedidos reais.
