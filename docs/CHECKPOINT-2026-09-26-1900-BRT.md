# Checkpoint de preservação — 26/09/2026, 19h BRT

## Estado e restrições

- Homologação de cartão interrompida. Somente diagnóstico da entrega automática do pedido #1003 está autorizado; não enviar APRO, repetir OTHE, concluir 3DS ou simular webhook.
- Sem alterações de secrets, credenciais ou IDs e sem deploy corretivo. Não publicar no Cloudflare nem configurar CAPI.
- Diagnóstico temporário v2 do #1002 expirou em 26/09/2026 19:10 UTC (16:10 BRT). O código permanece presente, mas o ramo está inativo após o corte; fluxo normal de validação retomado. Deploy versão 14 representado no commit 16f2bd541b066ede1890ee5ee9668351abac8d3f; captura válida no d2eda2087b082655b2699b3f60cbd545e488b2e6.
- Operador confirmou que a simulação das 15:37 foi enviada na opção Teste. O live_mode=true desse payload não é prova de produção.

## Pedido #1003

- Operador enviou OTHE uma única vez aproximadamente às 17:22 BRT; HTTP 201, idempotent=false. Referência LOD-0926-CTST-7K3M; total BRL 25,00; pipoca Choco-Nute 500 ml, retirada, identificação HOMOLOGACAO CARTAO NAO PREPARAR.
- Antes do envio, AUTH-CHECK retornou checkout_disabled sem autenticação adicional. Depois de Add secret key no menu de Add header, retornou invalid_order_id, como esperado para o ID inválido. Esses checks não criaram pedidos nem consumiram token.
- Consulta SQL somente leitura após a criação encontrou ambiente test, uma tentativa, payment_status=pending, order_status=payment_pending, gateway_status=action_required, gateway_status_detail=pending_challenge e paid_at=NULL. OTHE ainda não homologou recusa; havia desafio 3DS pendente.
- Mercado Pago Order: ORDTST01M3FP3FQBJZWNBNX3YWPZHKJ8. Na consulta, event_outbox=0 e print_jobs=0. Estado observado naquele momento, não uma garantia de estado futuro.
- Evento order.created em payment_events às 20:22:02.553461 UTC veio da aplicação da resposta síncrona de criação; não comprova sucesso do webhook.
- Operador confirmou ausência de QZ/impressora ativa e equipe avisada para não preparar pedidos de homologação. Em eventual aprovação, código pode enfileirar cozinha, impressão e meta_purchase. CAPI estava desconfigurado nas verificações anteriores; não configurar nem drenar filas como parte do diagnóstico.

## Entrega automática de 17:22:04 BRT

- HTTP 401; log de rejeição SignatureMismatch.
- Invocation ID: c4421ce6-cade-4ecd-9aab-9e5d648a8c08.
- Log de erro ID: ede19bd5-44e2-47cc-a4b7-9df3f664ed25.
- Execução comum aos dois registros: 4c9af3af-bc4f-4bce-b929-c36f66d24adf; deployment versão 14.
- URL preservada contém data.external_reference=LOD-0926-CTST-7K3M, data.id=ORDTST01M3FP3FQBJZWNBNX3YWPZHKJ8 e type=order. User-Agent: MercadoPago WebHook v1.0 order.
- Também apareceu outra rejeição às 17:22:05; não atribuir a uma segunda ação manual do operador.
- Logs disponíveis não preservaram x-signature, x-request-id do Mercado Pago, body, HMAC ou fingerprint dessa execução. O request_id interno do Supabase não foi tratado como o header assinado.
- Não é possível reconstruir a comparação criptográfica exata retrospectivamente com esses registros. Não alterar normalização do ID por hipótese.

## Divergência de aplicações — evidência e limite

- Operador informou pelo painel local que o body da entrega do mesmo pedido contém application_id=3953937740476211, ambiente Teste, action=order.action_required e envio 20:22:02 UTC. Imagens anexadas não ficaram legíveis ao agente; a fonte dessa identificação é a transcrição do operador.
- Aplicação configurada/simulada anteriormente: 7382535553656845. A simulação das 15:37 passou no SDK e HMAC manual com ID original, e o fingerprint do secret carregado correspondeu à referência comparada anteriormente.
- create-order usa exclusivamente MP_ACCESS_TOKEN_TEST como Bearer para criar Orders. Webhook usa MP_WEBHOOK_SECRET_TEST fixo, sem selecionar pelo application_id do body.
- Hipótese forte: Order associada a uma aplicação e validação com chave compatível com outra. Ainda não foi confirmada diretamente a aplicação do Access Token vigente nem o fingerprint no runtime de 17:22. application_id não faz parte do manifesto HMAC.
- Próximo dado pedido ao operador: na aplicação 7382535553656845, conferir se Credenciais de teste mostra vínculo com aplicação/conta 3953937740476211; informar apenas IDs/nomes/associação, nunca Access Token ou chave secreta. Nenhuma correção autorizada/aplicada.

## Preservação Git

- Antes deste checkpoint: main limpa, HEAD d2eda2087b082655b2699b3f60cbd545e488b2e6. Fetch de origin/main confirmou f856de6ffb5379975e5434a5e24ea72051ebde68; dois commits locais pendentes.
- Este arquivo preserva evidências e decisões posteriores, sem modificar comportamento do projeto. A solicitação atual autoriza envio seguro para main se houver autenticação disponível; caso contrário, exportação portátil para push manual, sem contornar autenticação.
