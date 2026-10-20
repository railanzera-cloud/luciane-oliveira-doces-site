# Mercado Pago — Orders API / assinatura HMAC — 20/10/2026

## Escopo e base
Projeto comercial exclusivo: `railanzera-cloud/luciane-oliveira-doces-site` e Supabase `edqiwvccmboyayojvuea`.
Base desta intervenção: `fix/trufadas-recontagem-sem-dupla-baixa-20261018` no commit `60b62fb9f48c1be755e106035ff444a5adca3444`.
Branch de correção: `fix/mp-orders-hmac-normalizacao-20261020` (consultar HEAD remoto).
A função publicada antes da correção era `mercadopago-webhook` v24 ACTIVE, em modo de TESTE, com `verify_jwt=false` para receber webhooks. O entrypoint publicado foi comparado byte a byte com a branch histórica `diagnostic/mp-signature-20261007`. O arquivo da base comercial era anterior e não devia sobrescrever a versão publicada.

## Evidências de diagnóstico (somente leitura)
- Chamado Mercado Pago **WCS-53769**: orientar o cálculo HMAC com `data.id` da URL em letras minúsculas e conferir se o Webhook Secret é da mesma aplicação usada no teste (suporte informou a terminação esperada, NÃO transcrever chave completa).
- Em 26/09/2026, registro histórico de diagnóstico de assinatura verdadeira no ambiente de teste: `sdk_valid=true`, assinatura coincidente com o identificador original, aplicação indicada pelo corpo igual à referência daquele diagnóstico e fingerprint do segredo igual à referência histórica. A etapa era **diagnóstica**, não equivale à confirmação financeira de pedido.
- Nove relatórios de 08/10/2026: `sdk_reason=SignatureMismatch`; `matches_sdk_manifest=false` e `matches_lowercase_id=false` nos nove casos. Não houve correspondência com outras variantes de IDs ou `request-id` testadas. O segredo do runtime tinha a mesma impressão digital nas nove execuções, e ela coincidia com o fingerprint histórico de setembro. Os corpos desses testes indicavam `live_mode=false` e `application_id` diferente da referência de 26/09. IMPORTANTE: esses campos vêm do body de notificações cuja assinatura falhou, logo **não são dados autenticados**. Não tomar diferença de aplicação como comprovação definitiva.
- Nenhuma leitura de segredo completo foi efetuada e nenhuma credencial foi transportada para GitHub, ZIP ou resposta.
- O SDK Node Mercado Pago valida o HMAC sobre a representação exata de `dataId` que recebe; por isso, cabe à integração passar o valor canônico para a tentativa principal. Mensagem do suporte é específica desta integração; exemplos gerais do SDK passam o query ID sem normalização.

## Intervenção preparada
- Código do webhook alinhado à **versão v24 efetivamente publicada** antes da correção (sem reviver diagnósticos expirados da branch comercial).
- Novo `signature-case.mjs`: a primeira verificação HMAC recebe o query `data.id` em minúsculas. Somente em caso de `SignatureMismatch` de um ID cujo case mudou, uma **segunda validação criptográfica** tenta o ID original, preservando notificações antigas válidas. Assinaturas não conferentes, ausência e erro de formato permanecem rejeitados.
- O ID original continua sendo utilizado para `GET /v1/orders/{id}`, igualdade de `order.id`, idempotência e RPC financeira. O corpo da notificação NÃO é usado como fonte financeira. Nenhuma ordem é marcada como paga em consequência de uma assinatura isolada.
- Modo teste, OAuth/credenciais, Secret, Pix, 3DS/cartões, meta/tintim, impressão e Cloudflare não são alterados. Sem migração SQL, sem estoque, sem pedidos reais gerados.

## Verificações necessárias antes de declarar resolvido
1. Confirmar resultado do CI para o HEAD desta branch: `npm ci`, build, TypeScript, `node --test tests/*.test.mjs`, ZIP; observar a configuração do workflow. Foram realizados 8 testes locais sintéticos, todos aprovados, cobrindo os dois HMACs válidos e rejeições.
2. Conferir **sem divulgar a chave** se o `MP_WEBHOOK_SECRET_TEST` do Supabase corresponde ao segredo da mesma aplicação e ambiente no Mercado Pago (conferir somente terminação indicada pelo suporte, não enviar a chave em mensagens ou logs).
3. Comparar aplicação selecionada no simulador, credenciais de teste que criaram a Order e Webhooks > Configurar notificações. Teste de outubro usou uma aplicação aparente distinta; verificar o painel do Mercado Pago antes de presumir erro do provedor.
4. Só então publicar a Edge Function como versão de TESTE, com `verify_jwt=false`, guardando o código v24 para rollback. Deploy de função tem efeito imediato no endpoint atual. NÃO publicar Cloudflare, não mesclar main.
5. Enviar **uma** notificação de teste legítima controlada pelo painel Mercado Pago (nunca falsificar confirmação de pagamento) e correlacionar resultado HTTP, `x-request-id`, razão de falha e validação HMAC sem registrar o segredo/assinatura.
6. Se assinatura válida, verificar consulta da Order pela API e resposta do endpoint sem gerar `paid` indevido. A homologação de cartão/3DS é etapa **posterior e separada**.
7. Se ambos os manifests continuarem divergentes, rever o Secret e a aplicação. **Nunca** retornar 200 para assinatura inválida, aceitar o body não autenticado nem remover a validação.
8. Após sucesso de teste e critérios financeiros, discutir habilitação gradual do fluxo online na UI atual. Não ativar modo produção automaticamente.

## Estado
Código, helper e testes commitados em branch isolada, aguardando confirmação de CI e alinhamento da credencial do simulador. Status de publicação / homologação do webhook deve ser registrado separadamente quando ocorrer.

Referência de reversão: function v24, source idêntica ao entrypoint na branch `diagnostic/mp-signature-20261007`, sem helper; não realizar reversão sem confirmação da versão ativa.
