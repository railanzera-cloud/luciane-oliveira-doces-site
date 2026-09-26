# Gate restrito de assinatura — #1002

Estado: protocolo preparado; captura v2 não implementada nem publicada; nenhuma simulação enviada. Base funcional 6894413. A captura v1 expirou em 23/09/2026 07:49 UTC.

## Pré-condições

1. Nova janela precisa de autorização, pois a instrução anterior determinou preservar a expiração. Proposta: 60 minutos a partir do deploy, gravados como corte UTC absoluto; informar o corte antes do envio. Não renovar automaticamente.
2. Confirmar o ID público da aplicação Luciane Oliveira Doces em Dados da integração, separadamente do body recebido. Não ler/alterar chave, token ou configuração MP. Sem esse ID, application_matches deve ser desconhecido, não verdadeiro.
3. Comparar o código publicado com o checkpoint e preparar somente instrumentação. Preservar SDK mercadopago@3.6.1 e sua validação, sem fallback de autorização.

## Captura proposta para a única simulação

- Seleção restrita ao data.id exato ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT. Detectar duplicidade/ambiguidade entre data.id/data_id e divergência com data.id do body; não autorizar usando body.
- Executar o WebhookSignatureValidator oficial com os mesmos valores da função, registrando resultado booleano e motivo enumerado, inclusive ausência de entradas, erro de parsing ou sucesso. Não registrar mensagem arbitrária de exceção.
- Ler body com limite de bytes somente em memória para extrair comparações booleanas de application_id e data.id e live_mode booleano. Campos ausentes/ilegíveis viram null/unknown. Esses metadados não são autenticados pelo HMAC do manifesto e não provam origem da aplicação sozinhos.
- Logs: presença/comprimento/hash de x-signature; contagem de componentes ts/v1, ts estritamente numérico, tamanho/formato/caixa de v1; presença/comprimento/hash/validade de x-request-id; indicação de trim; correspondência do data.id; application_id presente/estrutura/comparação com baseline independente; ambiente do runtime e live_mode; SHA-256 do manifesto; comparação HMAC manual exata e variantes diagnósticas de caixa do ID/v1; SDK válido/motivo; booleano do digest do secret esperado.
- Manifesto, HMAC, assinatura completa, body bruto, segredo e dados pessoais nunca entram nos logs. O digest esperado já confirmado é preservado, sem nova exposição da chave.
- Impedir efeitos sobre #1002: ramo temporário de observação encerra ANTES de consultar MP, aplicar evento SQL ou disparar efeitos, inclusive com assinatura válida. Nenhuma confirmação/cancelamento financeiro será produzido por esse teste. Marcar claramente a resposta intencional de diagnóstico e a etapa alcançada; não confundi-la com 401 indevido no fluxo normal.
- Escopo de coleta não se amplia para outras Orders. O operador fará um único clique; retries automáticos podem ocorrer, mas não autorizam segundo envio manual. Parar a análise após primeira requisição útil. Expiração permanece finita e não é estendida se não houver resultado.

## Simulação oficial preparada — não enviar ainda

Fonte primária consultada em 26/09/2026: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications (seção Simular a recepção da notificação).

No painel, Suas integrações → aplicação Luciane Oliveira Doces → Webhooks → Simular. Selecionar a URL de TESTE já cadastrada, sem salvar/alterar configuração:

https://edqiwvccmboyayojvuea.supabase.co/functions/v1/mercadopago-webhook

Evento: Order (Mercado Pago).
Data ID: ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT.

Somente após deploy validado e janela ativa: clicar Enviar teste uma única vez. Devolver horário UTC/local e status HTTP exibido, sem headers completos, segredo ou body. Timeout/resultado ambíguo: parar e consultar logs, sem clicar novamente. Nenhum novo pedido/token/cartão.

## Classificação após evidência

- HMAC manual válido / SDK inválido: identificar diferença concreta de parsing/canonicalização ou regra do SDK; propor correção estreita, sem aceitar variantes por tentativa.
- HMAC e SDK válidos / fluxo normal retornando 401: identificar origem do 401 por execução/etapa. Não usar o 401 proposital do ramo de observação como prova desse defeito.
- HMAC inválido com app/secret corretos: demonstrar baseline do app, igualdade runtime do digest e entradas estruturadas; não rotacionar secret por exclusão. Resultado do simulador não prova que a entrega automática histórica foi assinada da mesma forma.
- Aplicação/ambiente divergentes: apontar campo e fonte independente divergentes; não alterar credencial/configuração automaticamente.
- Parsing/canonicalização divergentes: demonstrar qual variante bate, mantendo o validador funcional intacto até autorização da correção.
- Ausência de dados suficientes: marcar inconclusivo; não inventar uma família nem criar cartão automaticamente. Só então avaliar o pedido isolado como alternativa, preferindo estruturas existentes e sem migration.
