# Observador temporário de assinatura — pedido #1003

Patch local sobre `917b55b7771acde712d96835515329e81f2f99f3`, em main limpa.
Não autoriza deploy, push, pagamentos, simulações, reenvios, mudanças de secrets ou atualização manual do pedido.

## Evidência acumulada (sem repetir auditorias)

- Operador comparou localmente a assinatura de Webhooks / Modo de teste e o digest do Supabase: iguais.
- Aplicação principal 7382535553656845; credenciais de teste mostram 3953937740476211. A diferença de IDs não prova chaves divergentes.
- #1003: ORDTST01M3FP3FQBJZWNBNX3YWPZHKJ8, referência LOD-0926-CTST-7K3M.
- Segundo consulta do operador em 28/09: order_status=payment_pending, payment_status=pending,
  gateway_status=action_required, gateway_status_detail=pending_challenge, paid_at=null.
- Evento do provedor em 26/09 21:27:29 UTC: order.canceled, canceled/expired, pagamento expired/expired, live_mode=false.
- Operador correlacionou 401 e SignatureMismatch às 18:27:31 BRT (execução 5c28a664-7e52-4812-a455-90b6037a2281)
  e 18:27:32 BRT (a23e55f8-b89b-449d-b375-bb1cf016bff5). Headers originais não disponíveis no painel.
- A divergência do banco está confirmada; a causa criptográfica ainda não.

## Escopo e expiração

Somente POST, PAYMENTS_ENVIRONMENT=test e ID selecionado pela lógica original exatamente igual ao #1003.
Janela absoluta de 28/09/2026 15:00 UTC até 29/09/2026 15:00 UTC (12h BRT), limite final exclusivo.
Cold starts não renovam a janela. Nenhuma variável de ambiente nova é necessária.
Se a aprovação ocorrer após o prazo, NÃO publicar este patch esperando captura: revisar as constantes
em uma alteração local explícita e revisar novamente antes de autorizar deploy. Nunca ampliar silenciosamente o escopo.

Limites: query 4096 caracteres; x-signature 2048; x-request-id 200; body clonado 65536 bytes.
Orçamento assíncrono de 250 ms, sujeito à disponibilidade do event loop. Não é promessa de tempo real rígido.
Somente a cópia do body é lida; cancelamento da cópia não é aguardado, para não bloquear a leitura original.
Pode haver esse pequeno custo de latência nas entregas dentro do escopo; fora dele não há leitura de body nem HMAC adicional.

## Comparações

SDK fixado em 3.6.1, parsing manual equivalente: último ts/v1 não vazio, nomes das chaves sem distinção de caixa,
ID e request ID com trim, componentes vazios omitidos. O HMAC é calculado em memória, sem persistência das entradas.

- matches_sdk_manifest: mesmo manifesto do SDK.
- matches_lowercase_id: ID selecionado em minúsculas.
- matches_raw_request_id: request ID sem trim adicional.
- matches_lowercase_raw_request_id: as duas variações combinadas.
- matches_alternative_query_id: algum outro valor de data.id/data_id coincide (somente booleano agregado).
- matches_body_id / matches_body_lowercase_id / matches_body_raw_request_id: fonte body quando distinta.

Os valores do request ID são os entregues pela API Fetch/Headers. Se a infraestrutura já removeu espaços,
este patch não recupera os bytes originais da rede. O body é não autenticado e nunca fonte financeira.
Resultados ausentes são não avaliados, não falsos. timed_out e diagnostic_failed tornam capturas incompletas explícitas.

Log único lod_mp_signature_1003_v1: comparações booleanas, contagens/comprimentos, estado fixo de parsing,
motivo do SDK em lista fechada, horário, identificação fixa da revisão e SDK. SB_EXECUTION_ID só é incluído
quando corresponde a UUID; versão do deploy deve ser correlacionada nos metadados nativos do Supabase.
A revisão verifica por booleano o fingerprint esperado em memória, sem imprimir digest ou secret.
Não inclui headers brutos, seus hashes, tokens, v1, HMACs, manifestos, URL, body, identidade ou dados do comprador.
Sem exceções serializadas. Não há endpoint de diagnóstico nem log adicional fora da janela/recurso.

## Preservação da decisão

O observador retorna Promise<void>, nunca Response nem autorização. O SDK original continua sendo executado
no mesmo bloco, com os mesmos argumentos e tratamento de erros. As comparações alternativas não são usadas
em qualquer condição financeira. Falha de leitura, criptografia, parsing, timeout ou logger fica contida.
O helper não consulta rede/banco. Código anterior, incluindo diagnósticos #1002 já expirados, permanece intacto.

Se o SDK original aceitar uma entrega legítima, o fluxo normal continua e pode reconciliar o pedido após consultar
Orders. Não há bloqueio financeiro novo: isso seria uma mudança de comportamento, fora do escopo.
Nenhuma consulta/escrita remota foi executada na preparação; testes usam somente fixtures e fetch simulado.

## Possibilidade de nova entrega e alternativa mínima

Documentação oficial consultada em 28/09/2026:
https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
Seção "Ações necessárias após receber a notificação": confirmação 200/201, espera de 22 segundos,
novas tentativas a cada 15 minutos inicialmente e prazos maiores após a terceira tentativa.
A documentação não oferece nessa seção um prazo final garantido para o #1003.

Conclusão: há possibilidade razoável de retry da notificação existente, mesmo com a Order expirada;
expiração da Order não prova encerramento da entrega do evento. Não temos evidência de retry agendado agora.
Antes de propor deploy, consultar apenas a atividade recente desse recurso, para evitar uma janela sem tráfego.
Não publicar agora; escopo técnico pronto não equivale a autorização de publicação.

Se não houver mais retries: menor alternativa é solicitar uma única reentrega do evento automático order.canceled
já existente, pelo controle de reenvio do registro se disponível, ou pelo suporte do Mercado Pago.
A disponibilidade desse controle não foi verificada. Isso exigirá autorização separada; não usar "Simular"
nem criar pedido/cartão como substituto, pois uma simulação já válida não reproduz necessariamente o emissor automático.
Uma reentrega cria uma nova tentativa/assinatura, não reconstrói os headers perdidos da tentativa antiga.
Se a assinatura passar pelo SDK atual, poderá ocorrer a reconciliação normal do cancelamento no banco;
isso deve ser explicitado antes de autorizar a reentrega. Não prometer ausência de efeitos do fluxo normal.
Se reentrega não estiver disponível, escalar ao provedor antes de propor nova operação financeira.

## Validação local

- 20 novos testes do observador, incluindo escopo, expiração, capitalização, fonte do ID, request ID,
  campos duplicados, falhas, body limitado, timeout, privacidade e equivalência do caminho válido.
- 7 testes existentes de assinatura + 20 novos com SDK oficial 3.6.1: 27/27.
- npm test: build concluído; 189/190. Única falha: teste HTML administrativo esperando "Verificando acesso",
  já documentada no baseline das rotas curtas (169/170). Não alterada neste patch.
- npm run lint: zero erros, cinco avisos preexistentes de imagens.
- Testes unitários não substituem uma captura de entrega real nem validação do runtime Supabase após futura publicação autorizada.
