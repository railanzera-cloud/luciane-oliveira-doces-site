# Gate restrito de assinatura — #1002

**Atualização 26/09/2026 18:15 UTC: v2 PUBLICADO com autorização explícita. Código remoto conferido integralmente, hash `46f93dbdf06f4a366b51a7d4afc1941c6c74fd28b5c709c6160022f11a9aed0d`. Corte fixo 19:10 UTC / 16:10 BRT hoje. Nenhuma simulação enviada pelo agente. Aguardar único envio manual e parar na primeira captura útil, antes de correções. Detalhes no checkpoint. As seções de preparo abaixo são histórico anterior ao deploy.**

Estado em 26/09/2026, após fornecimento do ID público: captura v2 preparada e testada como candidato separado; NÃO aplicada ao arquivo funcional, NÃO publicada, sem janela aberta e sem simulação enviada. Base Git inicial `02c3aac248e9c8663e5480936777e21184e46c55`. A captura v1 expirou em 23/09/2026 07:49 UTC.

## Pré-condições

1. Nova janela precisa de autorização, pois a instrução anterior determinou preservar a expiração. Proposta: 60 minutos a partir do deploy, gravados como corte UTC absoluto; informar o corte antes do envio. Não renovar automaticamente.
2. ID público informado pelo operador em 26/09/2026 às 14:35 BRT, obtido na sessão local da Luciane: `7382535553656845`. Essa é a fonte independente usada pelo candidato. O navegador em nuvem do Mercado Pago continua indisponível; não houve validação visual independente do número pelo agente. Não ler/alterar chave, token ou configuração MP. O ID público isolado não autentica uma notificação.
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


## Candidato preparado em 26/09/2026 — não publicado

- Código remoto completo obtido pelo editor do Supabase: 16884 caracteres, SHA-256 `fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05`, idêntico ao arquivo funcional local e ao checkpoint. O ZIP não foi obtido; a verificação usou seleção integral/cópia do editor, sem editar ou publicar.
- Logs / Last hour sem resultados nesta consulta. Isso não prova ausência de entregas históricas. Não foi repetida a investigação de retenção.
- Template `tools/homologacao/signature-1002-v2.ts.txt` separado para não entrar no build do site. O preparador `prepare-signature-1002-v2.mjs` verifica o hash da base, exige início/fim UTC absolutos separados por exatamente 60 minutos e escreve somente um arquivo candidato novo, nunca o arquivo funcional. Não publica nem envia requisições.
- O candidato adiciona um ramo antes da rejeição por entradas ausentes e antes do validador funcional. Seleção: ambiente test já exigido pelo fluxo, ID efetivamente selecionado da query exatamente igual ao #1002, início inclusivo e fim exclusivo. Outra Order não é capturada, mesmo que seu body alegue ser #1002.
- Mantém o SDK e todo o fluxo funcional existente. Headers acima do limite não são processados pelo diagnóstico. O body é lido em streaming com teto de 65536 bytes e limite de 2 segundos; logs guardam apenas estrutura e comparações. `application_id` numérico só é aceito para comparação se for inteiro seguro; string deve ser estritamente numérica. Ausência/invalidade produz null. O ID informado cabe com exatidão em um inteiro seguro JavaScript.
- `sdk_valid` representa exclusivamente o resultado do SDK. `normal_flow_missing_inputs` diferencia a pré-condição adicional do webhook, pois o SDK permite omitir request ID no manifesto. Nenhuma dessas observações libera processamento.
- Resposta deliberada **HTTP 409** com marcador `lod_mp_signature_1002_v2`, `stage=before_financial_lookup`, `effects_blocked=true`, inclusive para assinatura válida ou erro interno do diagnóstico. Não interpretar como rejeição HMAC nem como homologação de entrega financeira. Pode gerar retries do provedor; nenhum segundo envio manual está autorizado.
- 14 testes locais passaram com TypeScript 5.9.3 e SDK oficial mercadopago 3.6.1. Cobrem sucesso SDK/HMAC sem efeitos, minúsculas do ID, caixa do hash, query duplicada/alias conflitante, body divergente, aplicação ausente/inválida, assinaturas ausentes/malformadas, request ID ausente, ts/v1 duplicados, limites de headers/body, JSON inválido, falha criptográfica, outras Orders/produção/expiração e recusa de janelas maiores. Rede substituída por stub que impede chamadas reais. Não homologa pagamento ou entrega externa.

Para reproduzir os testes, instalar as duas dependências em pasta temporária externa ao projeto (sem modificar package.json/lockfile) e executar:

```sh
LOD_DIAGNOSTIC_MODULES=/caminho/temporario/node_modules node --test tools/homologacao/signature-1002-v2.test.mjs
```

### Próxima etapa, ainda bloqueada para envio

O operador pediu explicitamente não enviar teste ainda. A autorização anterior de coleta expirou e o checkpoint exige autorização de nova janela. O candidato está concreto e testado; aguardar confirmação de disponibilidade e autorização para abrir 60 minutos. Somente então definir início/fim absolutos, gerar candidato, verificar/persistir o diff, publicar no Supabase e comparar integralmente o código remoto. Informar o corte UTC/BRT antes de orientar qualquer clique manual. Não usar os horários fictícios dos testes para deploy.

Não é necessário outro dado do Mercado Pago para preparar a captura. O futuro retorno mínimo após o único envio será horário com fuso e status HTTP do simulador, sem headers, credenciais ou body bruto. Após a primeira captura útil, analisar os booleanos e remover a instrumentação; não renovar automaticamente.
