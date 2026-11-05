# Matriz de impacto comercial — teste de integração por mudança
Aplicar por **dependência real**: nem toda mudança precisa percorrer tudo, mas nenhum fluxo afetado pode ficar sem validação.

| Alteração | Inspecionar e validar antes de declarar concluído |
|---|---|
| Novo produto/sabor/tamanho/variante | Catálogo/IDs históricos → fotos e nomes → preços e regras → disponibilidade/estoque/reserva → configurador → carrinho → checkout → backend/RPC → persistência do pedido → resumo/WhatsApp → admin → cozinha/QZ → resultados/relatórios → cancelamento/retentativa |
| Preço/promoção | Regras por tamanho/grupo, prazo/fuso, cotação no servidor, carrinho/checkout, recibo/pedido, estoque, rollback após campanha |
| Imagem/nome/layout de categoria | Asset real e recorte, título, link/destino, SEO/acessibilidade, mobile, contraste, CTA; **não** alterar IDs/estoque/checkout se não houver dependência |
| Refinamento de configurador | Etapas, seleção persistente, opções esgotadas, preço, erros, teclado, rolagem iPhone, retorno, integração com carrinho |
| Carrinho/checkout | Itens/quantidade/variante, totais/taxas, endereço/retirada, método de pagamento, idempotência, retry, persistência, retorno da aba |
| WhatsApp | Destinatário, mensagem condicional Pix/cartão/dinheiro, ID e total do pedido, abertura vs envio, retorno/recuperação, duplicação |
| Estoque/pré-reserva | Ativação, capacidade, bloqueios atômicos, concorrência, expiração, cancelamento, reconciliação e painel |
| Mercado Pago/Pix | Status comprovado, webhook autenticado, dedupe, paid_at, estorno, pedido/cozinha/relatórios; sem Purchase artificial |
| Admin/CRM/Tintim/Meta | Permissões, consentimento, eventos, atribuição, opt-out, status, privacidade, observabilidade, sem disparo implícito |
| Cozinha/impressão | Elegibilidade, fila, claim/dedupe, QZ/conexão, layout ESC/POS 58mm, impressão incerta, reconexão, pagamento pendente vs confirmado |
| Mudança visual geral | Referência aprovada, comparação antes/depois, responsividade, Safari/WebKit, navegação, contraste, carregamento, não regressão de contratos |

## Exemplo: adição de Pipoca Trufada
Critério de aceite **não** é “produto aparece”. Precisa ser possível selecionar variante válida e quantidade, obter preço correto, respeitar saldo, colocar no carrinho, concluir pedido, recuperar no admin, apresentar mensagem correta e ter elegibilidade correta na cozinha. Testar erro de rede, esgotamento, clique duplo e cancelamento conforme contratos. Se migração estiver apenas preparada, **não declarar o fluxo produtivo liberado**.

## Portões de entrega
- **P0:** integridade financeira, dados pessoais, pagamento, estoque, permissões e pedidos; qualquer falha bloqueia publicação.
- **P1:** checkout utilizável, estados de erro, fluxo operacional, navegação e recuperação; corrigir antes de afirmar pronto.
- **P2:** polimento visual/UX e desempenho; validar contra referências aprovadas, registrar pendências honestamente.
- Separar: **implementado**, **testado no SHA**, **ZIP pronto**, **migração aplicada**, **publicado**, **homologado fisicamente**.
