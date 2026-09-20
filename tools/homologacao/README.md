# Homologação de cartão no computador do operador

## Retomada do challenge existente — pedido #1002

O arquivo independente `lod-3ds-1002.html` abre o challenge existente em iframe, conforme a integração 3DS da Orders API. Baixar e abrir esse HTML no navegador do computador; não precisa substituir/reiniciar o servidor de tokenização nem usar DevTools. Colar a URL completa original do challenge #1002 e clicar **Exibir challenge do pedido #1002**. Devolver print do quadro antes de qualquer confirmação manual.

A tela restringe origem HTTPS Mercado Pago e caminho do challenge #1002. URL com guest_token é fornecida manualmente e não é salva em Git, logs, armazenamento local ou backend. O arquivo não carrega SDK de tokenização, não chama APIs, não gera token, não cria/reenvia pagamentos e não faz polling/recarga automática. Evento COMPLETE exige origem e janela do iframe e nunca marca paid. A página pode ser aberta como arquivo local; compatibilidade real do challenge nesse contexto ainda depende da execução pelo operador.

Se houver expiração, não criar nova Order/token automaticamente. Preservar #1002 e consultar o backend antes de decidir outra tentativa. A documentação informa prazo de 40 minutos a partir da criação do challenge, mas o spinner não comprova expiração.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integrate-3ds

## Tokenização — aguardar orientação para outro cenário

Pré-requisito: computador com Node.js 18 ou superior e navegador Chrome/Safari. Não roda diretamente no iPhone. Não é necessário instalar dependências npm, clonar o projeto ou informar Access Token.

1. Baixe somente `lod-cartao-local.mjs` para Downloads.
2. Abra Terminal/PowerShell/Prompt de Comando nessa pasta e execute `node lod-cartao-local.mjs`.
3. Mantenha o terminal aberto e acesse `http://127.0.0.1:8789` no navegador **do mesmo computador**.
4. Clique em **Carregar formulário**. Nesta primeira etapa não preencha cartão e não habilite geração de token.
5. Devolva a mensagem exibida: **FORMULÁRIO CARREGADO** ou o erro completo/print. Se aparecer “node não reconhecido” ou “command not found”, devolva essa mensagem; a ferramenta ainda não iniciou.

O script usa a Public Key já existente na configuração de teste do projeto. Não contém credencial privada nem endpoint do Supabase. O servidor só escuta 127.0.0.1 e serve esta página por GET; não encaminha requisições. O navegador acessa diretamente o SDK e os campos seguros do Mercado Pago. Nenhuma configuração de rede do Work é alterada.

Esta etapa verifica a montagem do Card Brick, além do arquivo SDK que já abriu externamente. Não comprova aprovação/recusa, Orders API, webhook ou Purchase.

## Etapa posterior — somente quando o backend estiver pronto para o cenário

Abra a seção “Etapa posterior: gerar token de teste” e use os dados fictícios indicados na página. O botão do Brick só gera/exibe um token; não envia pedidos ou pagamentos. O JSON exibido corresponde ao objeto `card` aceito pelo backend, não ao corpo completo de create-order. Encaminhar apenas ao testador autorizado, mediante instrução específica. Nada é salvo no servidor local.

Preparar primeiro a composição disponível/preço e o corpo completo de homologação; só então gerar o token APRO para aprovação. A seguir preparar OTHE para recusa e uma nova tokenização APRO para retry **do mesmo pedido recusado**. A ferramenta trava repetição após obter um token; nova etapa requer recarga. Não tratar timeout como recusa, reutilizar token consumido ou gerar vários tokens/pagamentos por rotina.

O backend continua sendo a fonte financeira oficial, usando as credenciais existentes. Verificar estado da Order server-side e reflexo no pedido. Não habilitar checkout público, publicar Cloudflare/Sites, copiar chave interna para este arquivo ou marcar paid manualmente.

Fontes do contrato e dos dados de teste, conferidas em 20/09/2026:
- https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards

Verificação local realizada: sintaxe Node/JS, modo inicial sem token, resultado limitado ao contrato do cartão, bloqueio de segundo submit e respostas HTTP 200/403/404/405. SDK usado em memória nos testes é fictício; execução real externa ainda pendente.
