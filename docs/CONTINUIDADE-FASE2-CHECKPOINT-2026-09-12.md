# Luciane Oliveira Doces — checkpoint da Fase 2

Data: 12/09/2026. Estado: implementação em homologação, NÃO liberada para clientes.

## Retomada 26/09/2026 — aplicação identificada; candidato v2 testado e inativo

- Base inicial confirmada `main` / `02c3aac248e9c8663e5480936777e21184e46c55`, também igual ao remoto antes da alteração.
- Operador informou Nº da aplicação Mercado Pago `7382535553656845`, coletado na sessão local da Luciane; browser em nuvem MP permanece indisponível. O número público é baseline independente, não prova de origem de um futuro body.
- Supabase autenticado: cópia integral do código publicado com 16884 caracteres e SHA-256 `fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05`, igual ao arquivo funcional. Logs Last hour sem resultados; não inferir histórico.
- Preparados template separado, gerador com verificação de hash/janela e 14 testes focados, todos aprovados com SDK oficial 3.6.1. Detalhes e reprodução em `docs/GATE-ASSINATURA-1002-2026-09-26.md`. Nenhuma alteração no arquivo funcional, deploy, request ao webhook, consulta financeira, pagamento, secret ou credencial.
- Candidato retorna 409 diagnóstico antes de GET financeiro/RPC/efeitos, mesmo se assinatura válida. Body limitado e não autenticado só fornece comparações. Logs não expõem HMAC/assinatura/manifesto/secret/body/PII. Outra Order e fluxo fora da janela permanecem originais.
- Janela v2 NÃO aberta; usuário proibiu Enviar teste nesta etapa. Próxima ação: autorização/disponibilidade para uma janela de 60 minutos (a exigência de preservar expiração está documentada no gate); depois gerar timestamps absolutos, publicar/validar código e coordenar um único envio manual. Não pedir outro dado público MP agora. Causa SignatureMismatch ainda não isolada; cartão ainda não homologado.

## Retomada 26/09/2026 — gate de assinatura; simulação ainda não enviada

- HEAD inicial 6894413 e Git limpo, sem diff. Isolamento do novo pedido não chegou a ser implementado, aplicado ou publicado na execução interrompida: não há migration/patch novo. O trabalho anterior parou antes da consulta SQL de verificação; não houve submissão/token/pagamento. Prioridade atual é uma única simulação oficial da Order #1002, não criar pedido diagnóstico.
- Login Supabase renovado pelo operador. Logs e Invocations consultados pelo painel com janela exibida 20/09 11:37–26/09 12:37 e 20/09 11:38–26/09 12:38, respectivamente (horário do painel UTC-3). Ambos sem resultados disponíveis. Os registros antigos antes visíveis também não aparecem: isso não comprova que não houve entregas no intervalo, nem permite concluir que a instrumentação capturou algo. Não reabrir investigação genérica de retenção.
- Código publicado copiado pelo editor e conferido em 26/09: SHA-256 fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05, idêntico à base. Continua restrito ao #1002 e corte 2026-09-23T07:49:00Z. Diagnóstico EXPIRADO, sem renovação silenciosa. Não houve deploy nesta retomada.
- Instrumentação v1 registra apenas o ramo SignatureMismatch e não observa application_id/live_mode do body nem resultados de sucesso do SDK; portanto não satisfaz sozinha o gate atual. Nenhuma causa classificada por falta de captura contemporânea útil.
- Preparado protocolo restrito em docs/GATE-ASSINATURA-1002-2026-09-26.md. Falta autorizar nova janela (proposta: 60 minutos a partir do deploy, com timestamp UTC absoluto) e identificar o ID público esperado da aplicação por fonte independente. Não usar o application_id de exemplo da documentação nem inferi-lo da notificação recebida.
- A simulação NÃO foi enviada; a captura ampliada NÃO foi implementada/deployada. Antes do envio, preparar ramo temporário exclusivo #1002 que compare SDK/HMAC e encerre antes de GET financeiro/RPC/efeitos mesmo se a assinatura for válida. Resposta intencional de diagnóstico deve ser distinguida de falha de autenticação para não fabricar a família SDK/HMAC válidos + 401.
- Sem mudança no #1002, banco, credenciais, secret, URL/configuração MP, Pix, CAPI ou produção. Sem Cloudflare/Sites publish e sem QZ. Próximo passo é destravar a janela e o ID público esperado; depois preparar/validar/deployar somente o diagnóstico e entregar o único clique oficial ao operador. Parar após a primeira requisição útil e informar correção antes de aplicá-la.

## Retomada 21/09/2026 — diagnóstico aplicado; registro pós-deploy recuperado

- Base e0ba23b. O deploy autorizado ocorreu aproximadamente às 08:06 UTC; após recarregar, código remoto completo foi comparado com o local e coincidiu: SHA-256 fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05, 16884 caracteres. O registro Git não havia sido concluído antes da interrupção: na retomada às 12:57 UTC, HEAD ainda e0ba23b e somente o arquivo da função estava modificado. Este checkpoint conclui o registro pendente; sem novo deploy ou alteração funcional nesta retomada.
- Diagnóstico ativo somente para SignatureMismatch / test / Order ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT (#1002), até 23/09/2026 07:49:00 UTC. Expiração automática pela condição no código; não há tarefa agendada nem extensão da janela. Após expirar, o código permanece inerte até remoção.
- Manifesto completo e HMAC somente em memória. Logs sanitizados: hashes/comprimentos/estrutura dos cabeçalhos, request UUID validado, timestamp numérico e resultados booleanos das comparações HMAC e fingerprint do secret. Sem chave, assinatura/HMAC completos, corpo ou dados pessoais. Marcador lod_mp_signature_1002_v1. Nenhuma variante concede autorização; HTTP401 preservado no ramo rejeitado, sem acesso financeiro/SQL/efeitos nesse ramo. Fluxo válido preservado.
- Nove verificações locais focadas, ESLint da função e git diff --check já passaram antes do deploy; não repetidos nesta retomada. Proposta/patch documental atualizados para refletir a versão realmente aplicada, incluindo manifesto sem texto nos logs e corte às 07:49:00. Diferença antiga de ponto e vírgula alinhada ao código remoto, sem mudança de comportamento.
- Leitura do painel imediatamente após deploy (~08:07 UTC): Logs/Last hour sem resultados; não comprova ausência de entregas posteriores. Captura em docs/evidence/lod-diagnostico-1002-deploy.jpg. Próxima evidência depende de entrega automática, correlacionada pelo execution_id. Não provocar reenvio/simulação, token, pagamento ou novo pedido. Não estender expiração sem instrução.
- Consulta de novas entregas na retomada (~13:00 UTC) bloqueada por sessão expirada: dashboard redirecionou para Sign in com retorno à página Logs da função. Não afirmar ausência de entregas desde 08:07; é necessário login para ler somente os registros posteriores à publicação.
- Pedido #1002 preservado. Nenhuma nova consulta financeira nem alegação de aprovação. Credenciais, secret, URL/configuração MP, Pix, CAPI e produção intactos. Somente a instrumentação autorizada foi publicada no Supabase. Sem publicação Cloudflare/Sites ou trabalho QZ.

## Retomada 21/09/2026 — fingerprints iguais; proposta de captura não aplicada

- Base/HEAD inicial 02cf935, Git limpo. Operador retornou IGUAIS no cálculo local SHA-256 com entrada oculta e apresentou captura; chave de assinatura de teste do Mercado Pago corresponde ao digest do MP_WEBHOOK_SECRET_TEST configurado no Supabase. Atualização informada: 16/09/2026 00:19:36 UTC. Hipótese de divergência dos valores atuais descartada; não repetir conferência nem trocar credenciais. Valor na execução histórica não observado diretamente.
- Cabeçalhos antigos não estão nos registros disponíveis. Preparada somente proposta separada em tools/homologacao/diagnostico-assinatura-1002.patch, descrita em docs/DIAGNOSTICO-ASSINATURA-1002-PROPOSTA.md. NÃO aplicada ao arquivo funcional, NÃO publicada no Supabase. Código do webhook continua idêntico a 02cf935; cópia remota não relida nesta etapa.
- Diagnóstico proposto restrito a SignatureMismatch/test/Order #1002 e janela até 23/09/2026 07:49:19 UTC. Reconstrói manifesto/HMAC em memória; registra fingerprint/estrutura dos headers, request UUID/ts e manifesto quando formato seguro, mais booleanos para comparação exata, ID minúsculo, caixa do hash e fingerprint do runtime. Nunca imprime secret, v1/HMAC, corpo ou dados do cliente; nenhuma variante altera autorização. HTTP401 e ausência de efeitos preservados.
- Nove verificações novas, locais e isoladas da proposta passaram com SDK oficial 3.6.1 e dados fictícios; git apply --check aprovado sem aplicar. Não constituem captura real nem solução do SignatureMismatch. Nenhuma validação financeira anterior repetida.
- Próximo passo depende de autorização para instrumentação temporária, porque usuário proibiu alterar webhook nesta etapa. Sem autorização, manter proposta inativa. Depois de autorizada, depender de futura entrega automática; não reenviar/simular ou criar pagamento. Se não houver entrega, informar limite sem provocar evento. Preservados pedido #1002, credenciais, Pix, CAPI e produção; sem Cloudflare/Sites publish ou QZ.

## Retomada 21/09/2026 — manifesto do SDK e evidência order.canceled

- HEAD inicial 52c6f19, Git limpo. Usuário forneceu captura do painel Mercado Pago: Order ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT, ambiente Teste, order.canceled, falha401, data/hora do envio 20/09/2026 15:01:20 UTC. Painel não oferece assinatura, payload, URL completa ou corpo da resposta. Não solicitar novamente os mesmos campos indisponíveis.
- Usuário comparou invocations 4b0be048-6001-46f2-bc40-29d58c49d4a9 e 39200004-4d7b-41a5-b12b-38d16ea540f8: ambas POST401, mesma URL/Order/referência, User-Agent MercadoPago WebHook v1.0 order, deployment12 e resposta 15:01:21 GMT. IPs/execuções distintos. Isso confirma duas requisições para o mesmo recurso segundo a evidência trazida; mesma identidade de evento/reentrega é hipótese, pois falta identificador ou corpo. A diferença de um segundo é compatível com envio/resposta, sem provar identidade do evento.
- Registro anteriormente correlacionado de 15:56:18 UTC é 54min58s posterior ao horário do painel. Não é diferença de fuso e não deve ser tratado como a mesma entrega comprovada. Os logs anteriores exibiam duas ocorrências SignatureMismatch às 12:01:21 BRT; correlação individual por execution_id dessas duas continua pendente. Navegador remoto solicitou login na retomada anterior; usuário não conseguiu abrir o handoff e consultou os registros localmente. Nenhuma nova tentativa de login nesta leitura de código.
- Fonte primária do SDK fixado obtida em https://registry.npmjs.org/mercadopago/-/mercadopago-3.6.1.tgz, arquivo package/dist/utils/webhook/index.js, lido em memória sem instalação/alteração de dependências. Manifesto: id:<dataId>;request-id:<xRequestId>;ts:<ts>; . HMAC-SHA256 com options.secret sem trim. DataId e xRequestId passam por String(...).trim(), sem conversão de caixa; ts é extraído de x-signature, preservado como texto numérico. Nomes ts/v1 são normalizados para minúsculas, valores não. Comparação v1 é textual, constante no tempo, incluindo caixa e comprimento.
- URLSearchParams da URL registrada retorna exatamente ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT (32 bytes, uma ocorrência, trim sem efeito). A função prioriza data.id e só usa data_id se ausente; nenhum lowercase/uppercase ou re-encoding explícito antes do SDK. Decodificação padrão de query não altera esse ID alfanumérico. external_reference, corpo/action, IP, deployment e request_id interno do Supabase não entram no manifesto. Não usar esses metadados como substitutos do x-request-id do Mercado Pago.
- SignatureMismatch no SDK significa que havia ts numérico e hash de versão suportada, mas a comparação HMAC falhou. Não determina sozinho qual entrada divergiu. ToleranceSeconds não é passado pela função; relógio atual/idade da entrega não causam TimestampOutOfTolerance neste fluxo. Sem x-request-id e x-signature originais, não é possível reconstruir o manifesto completo nem distinguir chave divergente de alteração de cabeçalho/assinatura com os registros disponíveis.
- GET público exclusivamente diagnóstico do webhook nesta retomada retornou HTTP200: environment=test, ready=true, signature_secret_configured=true, access_token_configured=true. Código carrega exclusivamente MP_WEBHOOK_SECRET_TEST, sem seleção pelo payload e sem fallback para secret produtivo. Isso confirma presença/nome/ambiente, NÃO igualdade com a chave da aplicação emissora; valores secretos não lidos ou alterados.
- Comparação publicada do deployment12 já registrada em 20/09 permanece a última evidência de código remoto: única diferença local/remota é ponto e vírgula ausente na linha34, sem efeito no manifesto. Não alegar nova comparação autenticada nesta retomada. Documentação Orders consultada novamente mantém dataId=req.query['data.id'] diretamente: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications .
- Limite atual: nenhuma causa específica da divergência comprovada que autorize correção. Pedido #1002 preservado; cancelamento consta no painel do provedor, mas não foi aplicado manualmente ao banco nem houve nova consulta financeira. Sem nova tentativa/token/pagamento, reenvio/simulação, alteração de webhook/credenciais ou testes financeiros. CAPI/Pix/produção intactos. Alterada somente documentação; não repetir a suíte anterior.

## Retomada 20/09/2026 — HTTP 401 do #1002 identificado; causa da divergência ainda pendente

- HEAD inicial f54b359, Git limpo. Nenhum token, pagamento, pedido, configuração ou código funcional alterado. Usuário relatou COMPLETE recebido pelo iframe local; isso não comprova aprovação.
- Última consulta SQL já realizada em 20/09/2026 16:31:29 UTC: #1002 pending/payment_pending, paid_at=null, gateway action_required/pending_challenge, uma tentativa, nenhuma transição para paid e nenhum Purchase. Único evento persistido: order.created às 13:54:10 UTC. Não houve consulta autoritativa nova à API Mercado Pago nesta retomada.
- Endpoint exato rejeitado: POST https://edqiwvccmboyayojvuea.supabase.co/functions/v1/mercadopago-webhook?data.external_reference=LOD-M4CY-7K2P-8N6R&data.id=ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT&type=order . Resposta HTTP401 em 20/09/2026 15:56:18 UTC (12:56:18 BRT), execução 267ms, User-Agent MercadoPago WebHook v1.0 order. Invocation 7512117e-8d99-46a1-ae8d-8afea814ee89, execution 0383cda7-0573-44cd-9510-079656e1421c, versão12.
- Log 1fd12fe7-cac8-44ea-9ce6-5d39f8ffa444 contém mercadopago-webhook signature rejected SignatureMismatch e o MESMO execution_id. Isso confirma rejeição HMAC dentro da função, antes da leitura do corpo, GET financeiro e atualização SQL. Não é rejeição JWT do gateway Supabase nem evidência de Access Token inválido/403 de rede. Esta entrega não pôde atualizar #1002; não está comprovado que o evento fosse de aprovação ou que tenha sido causado pelo COMPLETE.
- Metadados consultados não expõem x-signature, x-request-id do Mercado Pago nem corpo/action. request_id 01a0bf88-56f4-7962-964b-d2f891462dec é identificador da execução no Supabase; não assumir que seja o cabeçalho assinado. A causa da divergência HMAC (entradas/secret da aplicação/modo) ainda NÃO foi isolada; não rotacionar chave nem alterar normalização por hipótese.
- Código publicado copiado integralmente pelo editor e comparado às 321 linhas locais: única diferença na linha34, ausência do ponto e vírgula em return null. Validador oficial mercadopago@3.6.1 e dataId original preservados. Hash remoto 0c334ea8c0c09677623cb885c2b68c8eb9c69c23b5764ab8fa19cd2475a0483f; local a9f368002f2cfc229dfe4d41919373b9d0ace619f85d0ce95806a815fab0cd61. Diferença não explica SignatureMismatch. Nenhum deploy efetuado.
- Documentação específica Orders consultada em https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications continua passando req.query['data.id'] diretamente ao SDK. Não desfazer correção previamente validada nem aceitar assinatura inválida.
- Próxima ação necessária: no navegador externo do usuário, Suas integrações > aplicação existente > Webhooks, abrir detalhes da entrega com falha HTTP401 correspondente ao #1002 às 12:56:18 BRT. Obter ação/corpo/URL e resposta exibidos, sem reenviar/simular, sem alterar configuração e sem compartilhar Access Token ou chave secreta. Esses dados precisam distinguir evento e aplicação/modo antes de definir correção. Se o horário aparecer em UTC, usar 15:56:18.
- Pix/#1001, webhook200 e idempotência anteriormente validados permanecem preservados. Cartão e confirmação server-side do #1002 seguem pendentes. CAPI/credenciais/produção intocados; sem Cloudflare/Sites publish ou QZ. Esta retomada registra apenas diagnóstico documental.

## Retomada 20/09/2026 — cartão #1002 criado; challenge em iframe local

- HEAD inicial d6dcc62, Git limpo. Ferramenta original lod-cartao-local.mjs preservada. Usuário confirmou montagem do Card Brick e gerou um token APRO no computador externo. SDK/tokenização fora do Work funcionaram; não repetir diagnóstico 403 nem atribuí-lo a Access Token inválido.
- Loja estava orders_open=false; usuário reabriu manualmente, leitura HTTP200 confirmou true e categoria Pipocas, 500 ml e Kinder Bueno disponíveis. Testador Supabase autenticado com chave interna existente pelo controle nativo e x-lod-test=1. Nenhuma credencial criada/alterada.
- Uma única submissão create-order retornou HTTP201: pedido #1002, UUID a53ec429-4f9d-45d9-af6e-8415f29f7a39, referência LOD-M4CY-7K2P-8N6R, 1x500ml Kinder Bueno, retirada, R$30. Gateway ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT, pagamento PAY01M2ZHGZJ36DR8WGNSSKSA7VX4, action_required/pending_challenge. Criação em 20/09/2026 13:54:08 UTC. Não repetir envio nem reutilizar token.
- Consulta public-order-status HTTP200 posterior confirmou pending/payment_pending, paid_at=null, R$30. Não confundir com consulta nova à API Mercado Pago nem aprovação. Token do cartão, tracking_token e guest_token não registrados neste checkpoint.
- Usuário abriu transaction_security.url em aba direta e relatou spinner/tela branca. Orientação anterior corrigida: documentação exige iframe no checkout. Usuário não consegue usar atalhos DevTools e pediu parar diagnóstico da aba direta. Não inferir causa ou expiração apenas do spinner.
- Acrescentado tools/homologacao/lod-3ds-1002.html, complemento local independente que recebe a URL existente e a abre em iframe restrito ao challenge #1002. Sem SDK/tokenização/API/pagamentos; sem persistir URL; sem recarga automática; COMPLETE checa origem/janela e não confirma paid. Arquivo local ainda precisa de validação real pelo usuário. Nenhum código comercial, webhook, Pix, CAPI, secrets, banco ou produção alterado.
- Documentação 3DS consultada também diferencia os nomes de teste APRO-CHOK/OTHE-CHNO e APRO-AUTH; a ferramenta anterior só aceita APRO/OTHE. Revisar esse contrato antes de eventual cenário posterior, sem alterar nem recriar o pagamento #1002 agora. Não desabilitar 3DS por conveniência. Prazo documental do challenge é 40 minutos; confirmar estado autoritativo antes de qualquer nova tentativa.
- Próxima ação manual: baixar/abrir lod-3ds-1002.html no navegador local, colar a URL original do challenge #1002, clicar Exibir challenge do pedido #1002 e devolver print antes de confirmar. Cartão aprovado/recusado/retry, confirmação server-side e Meta CAPI/deduplicação seguem pendentes. Pix/#1001, webhook200, idempotência, admin/Realtime/acompanhamento/CORS anteriores preservados. Sem publicação Cloudflare/Sites; sem QZ.

## Retomada 20/09/2026 — SDK externo acessível; ferramenta local preparada

- HEAD inicial `9d564d673d59a514d2245b357c680b5ee17604fb`, Git limpo. Usuário confirmou que Safari/Chrome fora do Work exibiu normalmente o JavaScript bruto do SDK público. Tratar 403/rps:w403 como restrição específica do ambiente Work nesse acesso; não há evidência de Access Token inválido. Não repetir o diagnóstico de SDK já concluído. API/tokenização autenticada externa ainda não foi validada.
- Criada ferramenta independente `tools/homologacao/lod-cartao-local.mjs`, com instruções em `tools/homologacao/README.md`. Um arquivo, sem dependências npm, para Node.js >=18 no computador do usuário; servidor somente 127.0.0.1:8789. NÃO é uma URL publicada nem funciona diretamente no iPhone.
- Usa a Public Key já existente em MP_PUBLIC_KEY_TEST; não cria, substitui ou expõe Access Token/credenciais privadas. Navegador local acessa SDK/campos diretamente. Servidor não faz chamadas externas e não tem endpoint de criação de pedido/pagamento, proxy ou túnel. Nenhuma mudança de CORS/backend/site/credenciais realizada.
- Primeira etapa bloqueia geração de token: operador abre a página e clica Carregar formulário; devolver FORMULÁRIO CARREGADO ou erro/print. Ainda não preencher cartão nem iniciar o modo de tokenização, para evitar gerar token antes de preparar a requisição de homologação.
- Etapa posterior opcional e explícita no arquivo: Card Brick retorna JSON mínimo do cartão tokenizado, sem PAN/CVV, só em memória na aba. Valida cenário fictício APRO/OTHE, cartão de teste final 3311, CPF/e-mail oficiais e uma parcela; trava repetição após token obtido. Não envia pagamento. JSON é objeto card, não corpo completo de create-order. Não usar dados reais nem confundir token gerado com resultado financeiro.
- Testes focados da NOVA ferramenta: sintaxe Node e JS; inicialização sem token; callback com SDK fictício/contrato mínimo; bloqueio de repetição; HTTP local GET 200/no-store, Host indevido 403, POST 405 e rota inexistente 404. Não usaram SDK/API reais nem credenciais privadas. Não constituem homologação do cartão. Validações anteriores não repetidas.
- Próxima ação manual: baixar lod-cartao-local.mjs; no Terminal/PowerShell da pasta do arquivo executar `node lod-cartao-local.mjs`; abrir `http://127.0.0.1:8789` no mesmo computador; clicar Carregar formulário e devolver mensagem/print. Se Node não existir ou usuário estiver somente no celular, informar a limitação para definir ambiente adequado; não afirmar que esse caminho já executou no dispositivo do usuário.
- Após montagem externa: preparar corpo de create-order no testador interno já autorizado, com composição disponível e valor conferidos, antes de gerar token APRO. Seguir APRO, OTHE e retry APRO no pedido recusado, verificando Order/pedido server-side. Sem mudar aplicação, credenciais, webhook ou pagamento existente. Meta CAPI/deduplicação e falhas restantes seguem após cartão.
- Nenhum token real, pedido novo ou pagamento enviado. Nada publicado Cloudflare/Sites e nenhum trabalho QZ/impressão. Ferramenta local é apenas material de homologação fora do build da aplicação.


## Retomada 20/09/2026 — consolidação de Pedidos/Realtime e bloqueio de cartão

Este é o checkpoint mais recente. As evidências abaixo já foram obtidas na execução interrompida e confirmadas pelo usuário; NÃO repetir a homologação operacional.

- HEAD encontrado: `5f295670f3f420759e196ebc60c0ad6134b7e694`, sem diff nem arquivos não rastreados. Faltava somente registrar o avanço operacional ocorrido depois desse commit. Fetch de main realizado nesta retomada. Não havia correção funcional pendente de commit.
- `/admin` autenticado exibiu #1001, dois potes 500 ml Leitinho, retirada, total R$50 e Pago — Pix. Fluxo executado pela interface: new → preparing → ready → ready_for_pickup → completed. Segunda aba recebeu eventos reais postgres_changes UPDATE, sem depender de atualização manual: preparing em 19/09 22:54:44.427 UTC; ready em 22:55:02.263; ready_for_pickup em 22:55:16.747; completed em 22:55:37.988.
- Evidência do callback Realtime coletada com marcador temporário de diagnóstico contendo somente número/status do pedido; marcador removido ao terminar e componente novamente idêntico ao commit 5f29567. Nenhum diagnóstico temporário ficou no código.
- Acompanhamento público refletiu Em preparo, Pronto, Pronto para retirada e Concluído, mantendo pagamento Aprovado e Retirada. Segunda aba retirou o pedido dos ativos automaticamente. Filtro Concluídos e cancelados exibiu #1001 Concluído e R$50. Histórico/conclusão e atualização integrada de status validados.
- Estado operacional mais recente do #1001: completed; financeiro observado na interface: paid. Nenhuma criação de pagamento, reenvio de webhook, alteração manual de payment_status ou trabalho de impressão realizado. Não usar antigos registros paid/new como estado operacional atual.
- A consulta SELECT final preparada no editor Supabase não teve resultado conferido antes da interrupção; não afirmar que houve nova confirmação SQL de paid_at, completed_at ou outbox nessa etapa. Não é necessário repetir o fluxo operacional por causa disso.
- CORS restrito e acompanhamento público já concluídos conforme registro abaixo. Não ampliar origens nem reaplicar função/configuração. Pix, webhook HTTP200, SignatureMismatch e replay/idempotência permanecem validados.
- Bloqueio do cartão permanece como evidência anterior de 403/rps:w403 no SDK público sem credenciais e na API pública. Não houve nova tentativa desses mesmos acessos nesta retomada nem qualquer indício novo que justifique trocar Access Token. O fetch financeiro feito pelo webhook no Supabase já funcionou anteriormente; isso demonstra um caminho backend que funcionava naquele momento, sem garantir disponibilidade atual de todas as operações de cartão.
- Caminho seguro proposto: executar o formulário/tokenização de TESTE em navegador/ambiente próprio autorizado com acesso direto ao SDK/API e continuar usando o backend Supabase existente. Não usar proxy/túnel para ocultar ou contornar o bloqueio do Work; não publicar checkout de teste para clientes. Esse caminho ainda NÃO foi validado fora do Work.
- Próxima ação manual mínima: no navegador normal do computador, fora do navegador remoto do Work, abrir `https://sdk.mercadopago.com/js/v2` e informar se aparece código JavaScript, download do script, ou erro de acesso. Não exige login, senha, cartão nem ação na aplicação da Luciane. Esta verificação apenas identifica disponibilidade externa do SDK; não homologa tokenização, API autenticada ou pagamento. Depois dela, preparar execução local/controlada do Card Brick com a Public Key de teste existente. Não criar token descartável antes de o envio de homologação estar preparado.
- Roteiro restante: cartão APRO; cartão OTHE; nova tentativa APRO no mesmo pedido recusado; confirmar estado por consulta server-side e webhook, sem marcar paid no cliente. Documentação oficial conferida em 20/09 mantém APRO/OTHE e orienta GET /v1/orders/{id} para verificar o resultado: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards . Contrato do Card Brick: https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md . Dados de teste não foram submetidos nesta retomada.
- Meta CAPI/Purchase/event_id/deduplicação e cenários críticos restantes continuam pendentes, após cartão, na ordem solicitada. Última evidência da função de efeitos: configured=false/test_events_configured=false. Nenhum Purchase real foi declarado enviado. CORS da prévia para process-order-effects não foi homologado; não confundir com o CORS público de status já concluído.
- Nenhuma publicação Cloudflare/Sites, migration, alteração de credenciais/aplicação/webhook ou trabalho QZ. Testes aprovados não repetidos. Esta retomada altera somente documentação.


## Retomada 19/09/2026 — CORS e acompanhamento visual validados

Este registro prevalece sobre o bloqueio de CORS abaixo. Não repetir Pix, webhook ou replay.

- HEAD local e origin/main conferidos em `a31c37cb988a93061ce6cf14a3b2950994ff7f11`. Diff inicial: public-order-status e teste de CORS ainda sem commit. Login Supabase renovado manualmente pelo usuário.
- Código remoto de public-order-status comparado integralmente antes da alteração: SHA-256 `c5e2e27f39fd9ce2a962a225d083aedaf99d190d0dfdd3de1a86d56d392b5cd2`, idêntico ao HEAD. Correção restrita aplicada pelo editor; após deploy e recarga, hash remoto `b094cfe76253030701e81094db3cb99631b8129fb176cf912bd0b02355ceec3c`, idêntico ao arquivo local. Nenhuma alteração em JWT, RLS ou projeção pública.
- Prévia permitida somente na origem exata `http://terminal.local:4173`, com `PAYMENTS_ENVIRONMENT=test` explícito e checkout público não habilitado. Não há wildcard nem proxy. O backend já usava test por padrão, mas a variável não existia: isso inicialmente manteve o bloqueio após deploy. Configurado apenas `PAYMENTS_ENVIRONMENT=test` em 19/09/2026 22:46:24 UTC. Credenciais MP, webhook e LOD_ADMIN_USER_IDS preservados; SITE_ORDERING_ENABLED continua ausente/desativado por padrão.
- CORS HTTP real após configuração: OPTIONS da prévia = 204 com Allow-Origin exato; origem Cloudflare existente = 204 preservado; porta 4174 = 403 sem Allow-Origin. Quatro testes locais focados passaram (incluindo fechamento em produção/ambiente ausente/checkout aberto, origens e autenticação). Lint focado da função e teste aprovado.
- POST real de acompanhamento: token existente = 200, Cache-Control no-store, #1001 paid/new, retirada, R$50/BRL, paid_at e updated_at originais de 16/09 preservados. Resposta com campos mínimos, sem nome/telefone/endereço. Token inválido = 404; chave pública ausente = 401. Token não registrado neste documento.
- Prévia visual `/pedido` validada: Pedido #1001, Pedido recebido, Pagamento Aprovado, Retirada, Atualizar e WhatsApp opcional. Link malformado exibe “Link de acompanhamento inválido”. Nenhum redirecionamento automático ao WhatsApp. Mudança operacional de status e Realtime ainda NÃO validados.
- Mercado Pago continua inacessível diretamente do Work: GET sem credenciais ao SDK público e a /v1/payment_methods retornou 403 com rps=w403. A API retornou corpo vazio. Evidência de bloqueio do ambiente, não diagnóstico de Access Token inválido. Nenhuma tokenização, Order ou tentativa nova criada. Não usar proxy para contornar controles de rede; cartão aprovado/recusado/retry requer ambiente autorizado com acesso ao SDK/API.
- GET real de process-order-effects: HTTP200, configured=false e test_events_configured=false. Nenhum Purchase enviado; evidência de resposta real da Meta e deduplicação Meta/Tintim continuam pendentes. Configuração CAPI/código de teste ainda necessária, sem solicitar secrets no chat.
- Ao abrir /admin na prévia, import antecipado de módulo opcional de impressão causava `crypto.randomUUID is not a function` e impedia até o login. Corrigido SOMENTE o carregamento no painel: import dinâmico dentro das ações de impressão. Nenhuma alteração no módulo QZ, assinatura, fila ou impressão; nenhuma dessas ações executada. Após reload, /admin abre corretamente a tela de login. Lint do componente aprovado. `tsc --noEmit` bloqueado pelos tipos de infraestrutura Cloudflare ausentes (cloudflare:workers, Fetcher e D1Database); não declarar typecheck completo aprovado. Não repetir build/suíte por rotina.
- Próximo passo: usuário assumir o login próprio do `/admin` na prévia (distinto do dashboard Supabase), depois validar Pedidos/Realtime e atualização do acompanhamento. Cartão permanece bloqueado pela rede; CAPI depende de configuração. Não publicar Cloudflare/Sites. Nenhuma migration, alteração financeira manual, nova cobrança ou homologação de impressão nesta retomada.


## Retomada 19/09/2026 — login válido; cartão bloqueado no ambiente de homologação

- Login manual Supabase concluído. Dashboard autenticado e formulário `Test create-order` acessíveis. Não reenviar o corpo padrão `{ "name": "Functions" }`: nenhum corpo de cartão pronto foi colocado nesse formulário.
- Main local/remota conferidas iguais em `58b5504` antes desta atualização documental. Última versão Sites continua 32; sem publicação Sites/Cloudflare.
- Nenhuma nova Order, cobrança ou tentativa de pagamento foi enviada a `create-order`. Pedido #1001 e evidências de Pix/replay abaixo permanecem preservados; não repetir por rotina.
- Consulta operacional pública: `orders_open=true`; categoria Pipocas, tamanho 500 ml e Kinder Bueno disponíveis. Próximo cenário de cartão pode utilizar 1 pote 500 ml Kinder Bueno, retirada, total R$30. Leitinho estava sold_out; não reutilizar a composição do Pix anterior para nova compra sem consultar disponibilidade.
- Documentação oficial vigente de Checkout API Orders conferida: cartão fictício Mastercard 5480832801033311, validade 11/30, CVV 123, CPF fictício 12345678909; email test@testuser.com; APRO para aprovação e OTHE para recusa. Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards . Somente dados oficiais de teste, nunca cartão real.
- Tentativa de tokenização com Public Key de teste não produziu token utilizável. A resposta de erro não era JSON; não concluir causa de autenticação com base nisso. Consulta diagnóstica separada GET à API pública `/v1/payment_methods` retornou HTTP403, corpo vazio e cabeçalho `rps: w403`. Não houve acesso ao Access Token privado.
- Página temporária isolada na prévia tentou carregar SDK oficial `https://sdk.mercadopago.com/js/v2`; formulário não apareceu e console registrou `MercadoPago is not defined`. Não houve CAPTCHA ou novo login identificado. O teste não comprova defeito no componente React do checkout; o SDK não ficou disponível nesse ambiente. Harness temporário removido, sem mudança no código comercial.
- Acompanhamento visual na prévia ficou em “Failed to fetch”. Preflight OPTIONS real de `public-order-status`, com Origin da prévia interna, retornou HTTP403 `origin_not_allowed`, sem liberação CORS. Não desativar validações nem usar proxy que oculte a origem. Não ampliar a lista sem preservar configuração atual e definir ambiente de homologação autorizado. O teste HTTP200 do acompanhamento registrado em 16/09 continua válido; a integração visual ainda não passou.
- `SITE_ORDERING_ENABLED=false` preservado. Nenhuma alteração de secrets, webhook, migrations, RLS, schema, funções ou configuração de origem nesta retomada. Sem impressão/QZ. Build/lint/suíte não repetidos para esta atualização documental.
- Próximo passo: disponibilizar ambiente de homologação capaz de carregar SDK/API do Mercado Pago e com origem autorizada no backend; então obter token APRO, preparar requisição interna e entregar confirmação de envio ao usuário. Depois testar OTHE e nova tentativa com token APRO, preservando o mesmo pedido no retry. Não declarar cartão homologado por tokenização isolada.
- Continuam pendentes: cartão aprovado/recusado/retry e respectivos eventos, painel/Realtime, acompanhamento visual e mudanças de status, resposta real da Meta CAPI/deduplicação e falhas críticas. Pendência de configuração Meta registrada em 16/09 não foi reaberta nem corrigida nesta execução. Não publicar até homologação integrada comprovada.

## Retomada 16/09/2026 — reenvio integrado sem duplicidade

Este registro substitui a pendência de replay do checkpoint anterior. NÃO solicitar outro reenvio da mesma simulação por rotina.

- Usuário reenviou Order no Mercado Pago, informou sucesso e renovou manualmente o login Supabase. Invocations confirmou **HTTP 200** em **16/09/2026 13:13:28 UTC (10:13:28 BRT)** para `data.id=ORDTST01M2DFM1WQBVVCKZ09VD49FGBV&type=order`, versão **11**. Invocation: `76caf0b6-2331-4475-abc9-e1aa44a472cb`; execution: `82afa6b2-d9c9-440d-88e2-12ef92f63de0`.
- Consulta exclusivamente SELECT após o reenvio confirmou: **1 pedido correspondente**, **1 tentativa de pagamento**, **1 evento order.processed**, **1 transição para paid**, **1 kitchen_order_actionable** e **1 meta_purchase**. As contagens são iguais às observadas antes do reenvio. Deduplicação integrada da notificação repetida validada para este cenário; não confundir com nova tentativa de cartão ou deduplicação de entrega à Meta.
- Pedido #1001 permanece R$50,00, `paid/new`, gateway `processed/accredited`. `paid_at` e `updated_at` permanecem `2026-09-16T01:41:53.940918+00:00`; não houve reconfirmação nem alteração do total. O evento processado mantém ID `577954e2-a77a-4bbd-a6cf-3592f3d8409d` e horário original. Há também um evento distinto order.created de 13/09.
- Eventos de cozinha e Meta permanecem únicos e pending, attempts=0, sent_at null. Nenhum Purchase enviado. A pendência de configuração Meta CAPI/código de teste permanece conforme diagnóstico anterior; não houve nova leitura/alteração de secrets. A existência do evento de cozinha ainda não comprova exibição/alerta no painel.
- Próximas etapas ainda não homologadas: cartão aprovado/recusado/nova tentativa, painel/Realtime, acompanhamento visual e Meta CAPI/deduplicação de envio. O núcleo Pix de teste (Order existente, pending → confirmação autoritativa pelo webhook, acompanhamento via API e replay sem duplicidade) passou; a Fase 2 completa e a liberação de produção continuam pendentes.
- Nenhuma Order/pagamento novo, mutation SQL, migration/seed/RLS, alteração de código funcional ou deploy. Sem Cloudflare/Sites e sem impressão/QZ. Apenas documentação atualizada; testes anteriores não repetidos por rotina.

## Retomada 16/09/2026 — notificação aceita e Pix 1001 pago

Este registro prevalece sobre os estados históricos abaixo. Não repetir criação de pagamento, migrations, seed, RLS, configuração de credenciais Mercado Pago ou deploy do webhook por rotina.

- Usuário confirmou o deploy da correção da assinatura e reenviou a simulação para a MESMA Order `ORDTST01M2DFM1WQBVVCKZ09VD49FGBV`. A captura do Mercado Pago mostrou 200 OK. Após novo login manual, Invocations confirmou POST HTTP 200 em 16/09/2026 01:41:54 UTC (15/09 22:41:54 BRT), função versão **11**, invocation `f202ced5-7416-4cb5-8a5e-4be49a06469a`, execution `58b52a92-18a7-44df-afd9-a4f83ea08eda`. URL contém exatamente esse data.id e type=order. A rejeição 401 de assinatura foi superada nesta notificação real.
- Acompanhamento real por `public-order-status`: HTTP 200, pedido **1001**, R$ **50,00** / BRL, `payment_status=paid`, `order_status=new`, `paid_at=2026-09-16T01:41:53.940918+00:00`. Token de acompanhamento não registrado neste documento.
- Consulta SQL estritamente SELECT no dashboard autenticado confirmou o pedido `LOD-G5HC-1F7F-ZZ7A`, UUID `78cd93cf-5d9e-4fc0-a24b-b108e0e79d85`, método `mercado_pago_pix`, ambiente `test`, gateway `processed/accredited`, pagamento `PAY01M2DFM1X58E7XJRW1QCWPGV44`. O total persistido e o total consultado no gateway são R$50,00.
- Evento de pagamento confirmado: `577954e2-a77a-4bbd-a6cf-3592f3d8409d`, `order.processed`, `processing_status=sent`, sem erro, recebido/processado às 01:41:53.940918 UTC. Snapshot financeiro consultado pela função na API contém a Order/referência corretas, `processed/accredited`, `total_amount=50.00` e BRL. `live_mode` e `version` vieram **null**, não false: não afirmar valor que a API não forneceu. O ambiente test consta no pedido e nas configurações já usadas para esta Order. O corpo fictício da simulação NÃO é a fonte financeira.
- Sem duplicidade observada: **1 pedido**, **1 tentativa**, **1 transição pending → paid**, **1 evento order.processed**, **1 evento meta_purchase** e **1 evento kitchen_order_actionable**. Há também o evento inicial `order.created` de 13/09, distinto da confirmação. Isto comprova o estado atual, mas ainda NÃO comprova replay integrado de uma segunda notificação válida após o primeiro 200.
- Outbox: `meta_purchase:LOD-G5HC-1F7F-ZZ7A` e `kitchen:LOD-G5HC-1F7F-ZZ7A`, ambos pending, attempts=0 e sent_at null. O pedido já está `new`, mas painel da cozinha/Realtime ainda não foi observado nesta execução; a existência do evento não prova alerta entregue.
- Purchase: `meta_purchase_status=pending`, event_id `lod_purchase_lod_g5hc_1f7f_zz7a`, zero tentativas e sem envio. Dashboard de process-order-effects registra POST 503 em 16/09 01:41:54 UTC, invocation `88f6ae94-029d-4fde-8ade-ea29f7893229`. GET público de diagnóstico retornou HTTP 200, `configured=false` e `test_events_configured=false`: a configuração Meta CAPI e o código de eventos de teste não estão completos. Nenhum secret foi lido/alterado e nenhum Purchase foi enviado nesta execução. Não confundir essa pendência com o webhook Mercado Pago, que processou o pagamento corretamente.
- Validado agora: recebimento real da notificação, atualização financeira do pedido existente, consulta pública do estado pago e ausência de registros duplicados neste processamento. Ainda faltam replay integrado/deduplicação, cartão aprovado/recusado/nova tentativa, painel/Realtime, acompanhamento visual e Meta CAPI/deduplicação. A homologação da Fase 2 inteira NÃO está concluída.
- Próximo passo de idempotência: reenviar a simulação Order com o MESMO data.id, sem criar pagamento, e conferir que não surgem nova transição/efeitos. Não é necessário reenviar para corrigir assinatura ou obter o estado pago: esses pontos já passaram. Configuração Meta deverá ser feita manualmente pelo responsável no ambiente de teste, sem enviar credenciais pelo chat.
- Nenhuma Order nova, alteração financeira manual, migration, seed, mudança de RLS ou publicação Cloudflare/Sites. Nenhum trabalho de impressão/QZ. Somente este checkpoint foi alterado; build/lint/testes locais não repetidos para uma atualização documental. Código da correção está no commit `6c54cef`; a última versão numerada Sites continua 32, sem nova versão/deploy nesta retomada.

## Retomada 16/09/2026 — simulação do pedido 1001 e assinatura

- Usuário confirmou a atualização de MP_WEBHOOK_SECRET_TEST com a chave da mesma aplicação/modo teste; não foi lida nem alterada nesta execução.
- Simulação existente recebida em 16/09/2026 às 01:16:02 UTC (15/09 22:16:02 BRT), POST com data.id=ORDTST01M2DFM1WQBVVCKZ09VD49FGBV e type=order. HTTP 401 confirmado em Invocations.
- Execução 220eb602-52c5-41fa-86b5-5dac1ab49182, função versão 9. O mesmo execution_id consta no aviso `mercadopago-webhook signature rejected SignatureMismatch`. Portanto a rejeição ocorreu dentro do validador HMAC, não no gateway JWT e não após consulta financeira/SQL. Invocation ID: 66af2299-1a5b-4d3a-9431-1adc83583c93; log ID: b5a39ea3-2975-4375-ad01-e06ce2361be5.
- Código publicado conferido via editor: hash SHA-256 6d8f030d88d3d890c09b6327ac90d2081aebd640dc8fe7310b855d17c37202f5, igual à função da versão salva 32. A cópia local antiga foi atualizada por fast-forward para 2ea6468 antes da alteração, preservando peso/prazo e demais trabalho salvo.
- Ajuste PREPARADO: passar dataId original ao WebhookSignatureValidator do SDK oficial 3.6.1, removendo conversão manual para minúsculas. A documentação atual específica de Orders passa req.query['data.id'] diretamente; o SDK mantém a caixa desse ID no manifesto HMAC. Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications . Não adicionar fallback que aceite assinatura inválida; manter consulta autoritativa e todas as validações existentes.
- Sete testes focados aprovados usando o módulo REAL utils/webhook do pacote oficial mercadopago 3.6.1 obtido no npm (temporário, sem nova dependência no site). Cobrem ID original válido e bloqueios para alteração de caixa, outro request ID, outro secret, header malformado, assinatura adulterada e ausente. API/SQL desses testes são simulados: NÃO comprovam correção da notificação real.
- Lint focado executado com --no-ignore nos dois arquivos alterados: zero erros e zero avisos. Não foi repetido build nem a suíte completa do site, pois esta alteração afeta apenas a função backend.
- Correção colocada no editor e conferida integralmente contra o arquivo local (13.163 caracteres), aguardando confirmação manual de Deploy updates pelo usuário. Até essa confirmação, NÃO declarar função corrigida/publicada. Depois, reenviar uma simulação do MESMO ID ou observar reentrega para verificar assinatura e resultado real. A divergência da assinatura só será considerada resolvida quando esse teste passar.
- Nenhuma nova Order/pagamento, nenhuma migration/seed/RLS, nenhum ajuste de credenciais, nenhum trabalho QZ e nenhuma publicação Cloudflare/Sites nesta execução. Pix/cartão continuam sem homologação ponta a ponta.

## Retomada 14/09/2026 — peso e prazo, pagamentos pausados

- Railan confirmou que ainda não fez a etapa manual com Luciane para conferir a assinatura do webhook. NÃO considerar secret conferido/substituído. Parar homologação até esse passo; não abrir novos logins ou repetir testes financeiros.
- Adicionados SLICE_WEIGHT_GRAMS=380 e DELIVERY_TIME_ESTIMATE no catálogo. Peso aparece nos cards de fatias e no carrinho; prazo médio de preparo E entrega aparece na entrada com loja aberta e no formulário de entrega. Não aplicar o tempo como promessa de retirada.
- Build aprovado e lint sem erros/cinco avisos existentes. Nenhuma suíte anterior repetida por rotina. iPhone real/inspeção visual final pendentes.
- Consulta real em 14/09: pedido 1001 ainda pending/payment_pending, paid_at null. Nada novo homologado de Pix/cartão.
- Exemplos das mensagens atuais e relatório: docs/RELATORIO-PESO-PRAZO-MENSAGENS-2026-09-14.md. Mensagem curta é suporte para pedido criado no site; finalização WhatsApp continua completa. Não afirmar que texto compacto único já atende ambos os canais.
- Nenhum deploy Cloudflare/Sites, nenhuma impressão/QZ, nenhuma mudança de Supabase/seed/RLS nesta retomada.

## Diagnóstico após novo login — 13/09/2026, 14h BRT

- Consulta real do acompanhamento: pedido 1001 segue pending/payment_pending, paid_at null.
- Logs do webhook nas últimas 24h confirmam reentregas APÓS a correção: 10:50:36 e 11:25:54 BRT, ambas com `mercadopago-webhook signature rejected SignatureMismatch`.
- O ajuste de minúsculas NÃO resolveu o bloqueio. Não declarar Pix aprovado. A causa exata (secret de aplicação diferente, valor cadastrado divergente ou outro detalhe do manifesto) ainda não foi isolada.
- Próximo passo indispensável: titular/usuário autorizado conferir a assinatura vigente da MESMA aplicação Mercado Pago que forneceu as credenciais de teste e compará-la/reinseri-la diretamente como MP_WEBHOOK_SECRET_TEST no Supabase. Não compartilhar secrets no chat, não gerar nova chave por rotina, não desativar validação, não alterar Access Token nem produzir nova Order para contornar.
- Painel Mercado Pago neste navegador retorna erro genérico antes da tela de login, inclusive na página inicial. Login Supabase foi renovado com sucesso pelo usuário. Página de secrets aberta apenas para preparar a conferência manual; nenhuma credencial foi lida ou substituída nesta retomada.
- Não houve novos testes locais, alterações de código, migrations/RLS ou publicação Cloudflare/Sites nesta retomada.

## Retomada 13/09/2026 após confirmação do ajuste da assinatura

- Railan confirmou o deploy do ajuste de assinatura; captura mostra Successfully updated edge function às 10:42 BRT. Não reaplicar essa alteração por rotina.
- Consulta real de acompanhamento após esse deploy: HTTP 200, pedido 1001 ainda pending/payment_pending e paid_at null.
- Invocations ainda mostrava somente as quatro rejeições 401 anteriores, às 10:34:34/38 BRT. Não há resultado de nova entrega após a correção nesta verificação.
- Tentativa de abrir https://www.mercadopago.com.br/developers/panel/app mostrou erro de acesso da página; uma recarga não resolveu. Não houve CAPTCHA identificado nem conclusão de login Mercado Pago. Próximo passo: acesso manual ao painel para inspecionar/reentregar a notificação original OU observar a reentrega automática. Não criar outra Order só para isso.

## Checkpoint 13/09/2026 — primeira transação Pix real de TESTE

- Railan confirmou a publicação corrigida de `create-order` e `mercadopago-webhook` (este na versão 6). O primeiro deploy de create-order falhou por import ../_shared no editor web; corrigido para ./commerce-catalog.mjs SOMENTE na cópia de implantação web. O repositório mantém o import correto para sua estrutura de pastas.
- Requisição enviada UMA vez pelo usuário no testador Supabase, com acesso interno nativo e checkout público desativado. HTTP 201: pedido 1001, order_id LOD-G5HC-1F7F-ZZ7A, UUID 78cd93cf-5d9e-4fc0-a24b-b108e0e79d85, R$50/BRL, pending/payment_pending. Dois potes 500ml Leitinho, retirada, dados oficiais APRO.
- Mercado Pago criou Order de TESTE ORDTST01M2DFM1WQBVVCKZ09VD49FGBV, payment PAY01M2DFM1X58E7XJRW1QCWPGV44, total_amount 50.00, action_required/waiting_transfer, QR e ticket sandbox retornados. Não houve pagamento bancário real.
- Quatro notificações reais chegaram ao webhook às 13:34:34/38 UTC, todas HTTP 401. URL corresponde à mesma Order e referência do pedido; execução da função v6 confirmada (não bloqueio JWT anterior à função).
- Consulta HTTP real de public-order-status com token do pedido retornou 200, pedido 1001, R$50/BRL, pending/payment_pending, paid_at null. Token não registrado neste documento; pode ser recuperado no resultado do testador ou no painel autenticado.
- Próxima correção PREPARADA localmente: normalizar dataId para minúsculas somente no manifesto de assinatura; manter ID original na API/SQL. Adicionados logs apenas do motivo da rejeição, sem assinatura, token ou secrets. A causa exata do 401 ainda precisa ser confirmada por nova notificação real; não presumir que o ajuste resolveu.
- Três testes NOVOS focados passaram: manifesto assinado com ID alfanumérico aceito; assinatura adulterada bloqueada antes de API/SQL; assinatura ausente bloqueada e logs sem credenciais. São testes locais com respostas simuladas, não comprovação de webhook real pago.
- Não repetir criação para este pedido por rotina. Próximo passo: aplicar correção preparada do webhook com confirmação manual, observar reentrega do MESMO evento e consultar acompanhamento. Se persistir 401, usar o novo motivo do log para diagnosticar; não desativar validação.
- Pix ainda NÃO homologado ponta a ponta. Cartão, deduplicação integrada, painel/Realtime, acompanhamento visual e Purchase/CAPI continuam pendentes. Nenhuma migration/RLS/seed repetida; nenhuma publicação Cloudflare/Sites; nenhuma impressão/QZ trabalhada.

## Continuação mais recente — segurança e Pix

### Retomada após login — publicação aguardando confirmação manual

- Login Supabase novamente confirmado pela tela autenticada do projeto. Railan pediu assumir pessoalmente CAPTCHA, login, autorizações e confirmações manuais.
- Auditoria remota confirmou que `create-order` AINDA contém o template antigo concatenado e precisa da atualização preparada. Os dois itens `commerce-catalog.mjs` exibidos no editor possuem conteúdo idêntico ao catálogo local; conferidos por cópia do texto completo, sem alteração comercial.
- Editor `create-order` preparado com conteúdo completo igual ao arquivo local (somente caminho do import adaptado ao arquivo irmão no editor); ausência do template comprovada. Ainda NÃO aplicado.
- Editor `mercadopago-webhook` preparado em outra aba; antes da edição, o código publicado foi comparado integralmente com a versão anterior esperada. A única mudança pendente é o tratamento de `country_code=BRA` quando não vem moeda. Conteúdo final conferido integralmente; ainda NÃO aplicado.
- Adicionado acesso de homologação em `create-order`: somente ambiente test + cabeçalho `x-lod-test: 1` + chave interna validada do servidor. O marcador ou a chave pública isolados NÃO concedem acesso. Isso permite usar o testador autenticado do Supabase sem definir `SITE_ORDERING_ENABLED=true` ou expor checkout para clientes. Nunca copiar a chave interna para o frontend ou para o chat; usar apenas a opção nativa do dashboard para requisição privilegiada.
- Sete testes focados passaram: bloqueio público, bloqueio do caminho interno em produção, preço real de duas pipocas 500ml Leitinho = R$50, dados APRO para o cenário oficial, resposta pendente/QR, rejeição de live_mode e interpretação segura da moeda. `npm run lint`: zero erros/cinco avisos img.
- Próximo passo: confirmar manualmente as atualizações preparadas de `create-order` e `mercadopago-webhook`. Depois testar a requisição Pix real com chave interna pelo testador Supabase e dados oficiais; verificar aprovação automática na API, notificação assinada, estado persistido e acompanhamento público. Não substituir esses testes por atualização manual de payment_status.
- Nenhuma transação real de homologação foi iniciada nesta retomada; nenhum novo resultado de Pix/cartão, Realtime ou Meta foi declarado aprovado. Cloudflare permanece sem publicação. Impressão/QZ não trabalhada.

- Escopo reafirmado por Railan: concluir Pix e cartão online, mantendo pagamento no recebimento, painel da cozinha, acompanhamento e WhatsApp. Somente impressão/QZ adiada. Não publicar Cloudflare nem Sites.
- Migração `20260912183000_phase2_retry_safety.sql` APLICADA: editor confirmou `Success. No rows returned`. O primeiro envio falhou porque o editor havia concatenado o SQL anterior; a entrada foi limpa e a execução correta terminou com sucesso. Não reexecutar por causa desse primeiro erro.
- RLS verificado ativo nas nove tabelas de pedidos/disponibilidade; anon não pode consultar orders nem executar diretamente o RPC de acompanhamento. Auditoria anterior à migração registrou zero pedidos.
- `LOD_ADMIN_USER_IDS` configurado no backend com os dois UUIDs de Railan/Luciane conferidos na tela Auth. `process-order-effects` publicado com autenticação interna ou usuário verificado nessa lista; JWT legado desligado após testes. Não há execução anônima arbitrária.
- `public-order-status` atualizado com projeção explícita de campos mínimos, token aleatório de 192 bits e sem consulta por número do pedido; JWT legado desligado após testes.
- Encontrado código de exemplo Supabase concatenado ao código real nas publicações antigas. `public-order-status` e `mercadopago-webhook` foram limpos e republicados. No webhook a revisão automática inicialmente recusou a publicação; após limpar o editor, comprovar visualmente a entrada correta e repetir a confirmação, a atualização foi aceita.
- `create-order`: correção do editor iniciada, mas publicação final NÃO confirmada antes do reinício do navegador. Auditar os arquivos publicados, incluindo as duas entradas de catálogo exibidas no editor, antes de retomar. Não presumir que a correção está publicada.
- `.env.local`: Public Key de teste fornecida por Railan configurada; `SITE_ORDERING_ENABLED=false`. Nenhum Access Token foi copiado do backend. Não habilitado checkout público de teste.
- QZ recebeu correção de autorização e testes antes do adiamento; NÃO publicado. Não continuar impressão nesta execução.
- Testes: build aprovado; 142/142 testes passaram; lint 0 erros/5 avisos img. Depois, ajustes específicos do Pix passaram em mais 3 testes novos (12/12 com a suíte backend). Não confundir testes isolados com uma transação real Mercado Pago.
- Pix: `payer.first_name` passa a usar o primeiro nome informado, permitindo o cenário oficial APRO. Webhook aceita `country_code=BRA` quando a Orders API omite moeda, sem substituir moeda estrangeira explícita. Essas duas últimas correções ainda são LOCAIS.
- Documento oficial de teste Pix: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix . Usa `test_user_br@testuser.com`, primeiro nome `APRO` e valor R$50,00; retorna `action_required/waiting_transfer` e depois aprovação automática. Duas pipocas 500 ml do conjunto 1 totalizam esse valor sem mudar o catálogo. Conferir disponibilidade real antes de criar o pedido.
- NÃO exigir prefixo TEST: a documentação atual da Orders API informa prefixo APP_USR também para credenciais de teste. Confirmar o ambiente pela configuração oficial, não só pelo prefixo.
- `tests/phase2-database-smoke.sql` preparado com rollback transacional; ainda NÃO executado. Não chama gateway e não prova webhook real.
- As três consultas HTTP externas tentadas nesta continuidade excederam 10 segundos; não provam resultado das funções.
- O navegador reiniciou e voltou à tela de login do Supabase. Novo acesso seguro solicitado. Ainda NÃO há evidência de Pix aprovado, webhook válido processado, pedido confirmado no painel ou acompanhamento atualizado de ponta a ponta. Cartão também não homologado. Preservar esses limites no relatório.

As seções abaixo registram o checkpoint anterior; os fatos acima prevalecem em caso de divergência.

## Projeto preservado

- Projeto Sites: `appgprj_6a8f9391fa9c8191a5c30f8430506936`.
- Código: `/workspace/sites/luciane-oliveira-doces`.
- Produção: https://lucianeoliveiradoces.pages.dev.
- Base anterior da Fase 2: `ca752e2a3f408d083375dab71fd34c284e865f48` (oito sabores e preço por conjunto), conferida igual à main remota antes de salvar este checkpoint.
- O prompt vigente da Fase 2 está no anexo Texto colado(3).txt. Ele autoriza pedidos, pagamentos online, painel, acompanhamento, CAPI e impressão. Substitui a proibição de pagamento online da rodada anterior.
- NÃO reconstruir o site. NÃO publicar no Cloudflare ou no espelho Sites sem autorização. NÃO reexecutar seed.

## Implementação presente no código

- Canal site separado do WhatsApp; Pix Mercado Pago, Card Payment Brick, dinheiro e cartão no recebimento.
- Backend recalcula produtos, combinações e taxas e reconsulta disponibilidade; não confia no total do navegador.
- Pedido com UUID, código LOD, número legível e token de acompanhamento; atribuição preservada.
- Migrações de pedidos, tentativas, eventos, histórico, outbox e impressão com RLS.
- Webhook valida assinatura e consulta a Order no Mercado Pago antes de alterar pagamento.
- Painel Pedidos adicionado ao admin existente; Disponibilidade e Auth preservados.
- Acompanhamento `/pedido` e resultado de pagamento, consulta periódica e suporte Tintim.
- Purchase server-side somente para pedidos do canal site pagos; canal WhatsApp continua com Tintim. Nenhum Purchase foi adicionado ao Pixel do navegador.
- Suporte opcional QZ Tray com assinatura autenticada no servidor e fila de impressão com claim atômico.

## Correções nesta continuação

- Card Brick passou a ler `paymentTypeId` do segundo argumento oficial do callback, preservando a seleção de crédito/débito.
- CORS da função de efeitos permite preflight do admin nas origens configuradas; demais origens são rejeitadas. POST exige token interno ou usuário autenticado.
- Pedido de teste exige `META_CAPI_TEST_EVENT_CODE`; não pode ser enviado como Purchase real. Pedido offline antigo sem ambiente é tratado como teste.
- Novos pedidos offline também registram ambiente, para separar teste de produção.
- Preparada migração adicional para vincular eventos à tentativa correta, ignorar eventos tardios de tentativas anteriores e preservar histórico.
- Preparada recuperação de efeitos interrompidos com lease de dois minutos, limite de tentativas e confirmação vinculada ao worker responsável.
- Painel tenta processar a outbox a cada 30 segundos quando visível, além do gatilho de confirmação de pagamento. Não existe scheduler independente do painel nesta versão.
- Resultado não oferece QR/link de pagamento cancelado ou estornado; apresenta nova tentativa após falha/expiração sem limpar carrinho.
- Ações de preparo não aparecem para pedidos online não pagos; preferências locais de áudio não impedem o painel se o armazenamento do navegador falhar.
- Rollback operacional agora bloqueia a reversão se houver tentativas estornadas incompatíveis com a estrutura anterior; não apaga nem renomeia esses registros.

## Estado real do Supabase

Projeto existente: `edqiwvccmboyayojvuea`. Usuários, catálogo, configurações e seed não recriados.

| Migração | Estado |
| --- | --- |
| `20260912123000_phase2_orders.sql` | Aplicada no checkpoint anterior |
| `20260912154500_phase2_operations.sql` | Aplicada nesta continuidade; editor confirmou sucesso |
| `20260912183000_phase2_retry_safety.sql` | Preparada localmente, NÃO aplicada |

| Edge Function | Estado verificado |
| --- | --- |
| `mercadopago-webhook` | Publicada; verificação JWT legada desligada; versão publicada ainda não contém a chamada à função de efeitos |
| `create-order` | Publicada; verificação JWT legada desligada; precisa receber as correções locais posteriores |
| `public-order-status` | Publicada; verificação JWT legada ainda LIGADA, confirmada no painel |
| `process-order-effects` | Código local, ainda NÃO publicado; depende da migração de retry e das configurações Meta |
| `qz-sign` | Código local, ainda NÃO publicado; depende de certificado e chave QZ opcionais |

Não confundir o `verify_jwt=false` local em `supabase/config.toml` com uma configuração já aplicada no dashboard. A validação de identidade continua no código das funções. RLS das tabelas privadas permanece obrigatório.

## Configuração e próximo checkpoint

- `.env.local` contém os dois valores públicos existentes do Supabase. Não sobrescrever.
- `SITE_ORDERING_ENABLED` continua desativado por padrão; não foi habilitado no backend ou em produção nesta rodada.
- O usuário confirmou cadastro de `MP_ACCESS_TOKEN_TEST` e `MP_WEBHOOK_SECRET_TEST` no backend. Saúde do webhook anteriormente retornou ambos configurados; isso NÃO prova uma transação concluída.
- Falta configurar a Public Key de teste no build: `MP_PUBLIC_KEY_TEST`. É pública; NUNCA pedir Access Token por chat.
- Para CAPI: `META_CAPI_ACCESS_TOKEN`, `META_GRAPH_API_VERSION` e, na homologação, `META_CAPI_TEST_EVENT_CODE`. Pixel padrão preservado: `1491655855979140`.
- Para impressão opcional: `QZ_CERTIFICATE` e `QZ_PRIVATE_KEY_PEM` somente no backend, além de QZ Tray e impressora instalados na cozinha.
- Antes de alterar a verificação JWT legada nas funções pendentes, obter autorização explícita de segurança. Não alterar usuários, chaves do projeto, Auth ou RLS de disponibilidade.
- Aplicar a migração de retry com a versão correspondente de `process-order-effects`; suas assinaturas de RPC mudaram. Não publicar apenas metade desse par.
- Revalidar o estado remoto antes de continuar; não assumir que o usuário não fez alterações depois deste checkpoint.

## Testes efetivamente executados

- `npm test`: build de produção concluído e **130/130 testes passaram**.
- `npm run lint`: **0 erros, 5 avisos de img** (quatro preexistentes e um do QR Code).
- `git diff --check`: aprovado.
- Na consulta HTTP de encerramento, `create-order` respondeu 405 ao GET, como previsto para um endpoint POST. Webhook e consulta pública excederam o timeout de dez segundos; isso não confirma falha permanente nem substitui a validação pelo fluxo real.
- Dez novos testes isolados executam o handler de efeitos com HTTP e credenciais fictícios: CORS, autenticação, ausência de configuração, segregação teste/produção, canal/estado, hash e ID estável, falha Meta e contrato do Card Brick.
- Testes de migração são inspeções de código SQL, NÃO testes transacionais reais no banco.
- O build emitia avisos de proxy/classificação de rotas e um conflito de porta HMR na suíte; os comandos terminaram com código zero e os 130 testes passaram.

## Pendências que impedem aceite final

1. Aplicar/validar a migração adicional e publicar as funções correspondentes, com configuração de acesso aprovada.
2. Configurar a Public Key de teste e habilitar SOMENTE uma homologação controlada, sem expor o checkout incompleto a clientes.
3. Testar Pix, cartão aprovado/recusado, 3DS e webhook válido assinado com as credenciais de teste. Não houve pagamento real ou simulação de sucesso declarada como pagamento confirmado.
4. Cobrir idempotência de ponta a ponta: retry técnico deve preservar chave E corpo; revisar especificamente o token do cartão se o SDK gerar outro token após timeout ou recarga. Não tratar uma resposta desconhecida como recusa e iniciar cobrança nova.
5. Validar a migração de retry em banco, eventos concorrentes/tardios, reconciliação de pagamento e recuperação da outbox. Na ausência de painel aberto, não há cron de retry; ao atingir dez tentativas, a falha exige tratamento operacional explícito.
6. Confirmar formato real de expiração Pix e dados de desafio retornados pela Orders API; conferir resultado/restauração, privacidade, edição e retorno após recarga.
7. Testar admin autenticado com Railan/Luciane, Realtime, múltiplas abas, alertas e restrições de operação.
8. Testar `/pedido` com token válido, inválido e ausência de dados pessoais.
9. Homologar eventos na área de testes da Meta, sem contaminar vendas reais; sem token CAPI, suporte fica implementado mas não comprovado por envio real.
10. QZ: conferir reconexão/renovação da sessão de assinatura, impressora escolhida, falha de impressão e comportamento com várias abas; teste físico 58 mm pendente.
11. Revisão visual/mobile, iPhone/Safari real, teclado, safe area, WhatsApp e retorno: não concluídos nesta Fase 2.

## Arquivos desta Fase 2

- Interface: `app/page.tsx`, `app/globals.css`, `app/admin/page.tsx`, `app/admin/layout.tsx`, `app/pedido/page.tsx`.
- Componentes: `admin-orders-panel.tsx`, `mercado-pago-card-form.tsx`, `site-order-result.tsx`.
- Clientes/configuração: `lib/admin-orders-client.ts`, `lib/commerce-config.ts`, `lib/qz-print-client.ts`, `lib/site-order.ts`, `types/qz-tray.d.ts`.
- Backend: `supabase/config.toml`, cinco Edge Functions, catálogo server-side e três pares de migração/rollback.
- Build: `.env.example`, `vite.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `scripts/package-cloudflare.mjs`.
- Testes: três suítes `phase2-*` e ajustes nos testes existentes de dispatcher/renderização.
- Este documento de continuidade.

Catálogo público, preços por conjunto, imagens, Fatias, tracking base e integrações anteriores não foram reescritos nesta continuação.

## Publicação e rollback

- **Não houve deploy no Cloudflare nem no espelho Sites nesta Fase 2.** Houve aplicação de migrações e publicação parcial de funções no Supabase conforme a tabela acima.
- O código deste checkpoint não é uma versão final aprovada para produção.
- Nenhum novo ZIP final de produção foi gerado. Pacotes antigos em `outputs/` não representam esta Fase 2.
- Os ZIPs anteriores foram preservados. O pacote de rollback antigo `a616252` reintroduz regras já retiradas, inclusive calda; não usar automaticamente.
- Para retorno à base imediatamente anterior, preservar o commit `ca752e2a3f408d083375dab71fd34c284e865f48` e não executar SQL de rollback sem avaliar dados e dependências.
- A reversão completa da primeira migração remove dados da Fase 2 e requer autorização específica. Nunca executá-la automaticamente.

Referência técnica consultada para o callback de cartão: [documentação oficial do Card Payment Brick](https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md).
