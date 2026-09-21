# Diagnóstico sanitizado — #1002

Estado: **aplicada e publicada no Supabase em 21/09/2026, aproximadamente 08:06 UTC**, com autorização explícita. Base: `e0ba23b`. Registro Git pós-deploy concluído na retomada; não houve segundo deploy.

## Evidência nova

Em 21/09/2026 o operador retornou `IGUAIS` e uma captura do cálculo local com entrada oculta. A chave de assinatura de teste copiada do Mercado Pago corresponde ao SHA-256 do `MP_WEBHOOK_SECRET_TEST` configurado no Supabase. Digest informado pelo operador: `e922f1fee5c9017f750266955ee129be10b171a5cfb9dcaded6e6efc7ffc15a2`; atualização exibida no Supabase: `16/09/2026 00:19:36 UTC`.

A hipótese de divergência entre os valores atuais comparados está descartada. Não pedir nova conferência nem substituir credenciais. O valor carregado na execução histórica não foi observado diretamente. A instrumentação abaixo verifica apenas igualdade do fingerprint dentro de uma futura execução, sem registrar o secret ou seu valor em texto.

## Limite de observação

O webhook atual registra apenas o motivo `SignatureMismatch`. Os metadados de invocações e o painel Mercado Pago já consultados não guardam os cabeçalhos necessários para reconstruir a assinatura antiga. Não há recuperação retroativa desses valores pelas evidências disponíveis.

O arquivo `tools/homologacao/diagnostico-assinatura-1002.patch` guarda o diff aplicado sobre `e0ba23b`; não reaplicar. Antes do deploy, a cópia remota foi comparada com a base: apenas um ponto e vírgula ausente na linha 34, preservado como estava no remoto. Após deploy e recarga do painel, o conteúdo completo coincidiu com o arquivo local: SHA-256 `fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05` (16884 caracteres). Não inferir número de versão sem metadado observado.

## Escopo ativo

- Executa somente no bloco que já rejeitou uma assinatura com `SignatureMismatch`, com ambiente `test` e ID exato `ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT`.
- Janela fixa termina em **23/09/2026 07:49:00 UTC**. A condição temporal desativa automaticamente o diagnóstico adicional; não estender a janela silenciosamente. O código permanece até remoção posterior.
- Cabeçalhos limitados a 2048 caracteres (`x-signature`) e 200 (`x-request-id`). Mantém a rejeição normal se excederem os limites.
- Lê apenas os dois cabeçalhos já usados pelo validador. Registra SHA-256/comprimentos, transformação de espaços, `ts` numérico, contagem de `ts`/`v1` e formato/caixa do hash. Não registra o `v1` nem qualquer HMAC calculado.
- Registra `x-request-id` apenas se tiver formato UUID. Reconstrói o manifesto exato com as mesmas regras do SDK 3.6.1 somente em memória. Registra apenas seu hash, nunca o manifesto completo; não corrige ou normaliza dados para fazê-los parecer UUID.
- Recalcula HMAC-SHA256 em memória e retorna aos logs somente resultados booleanos: manifesto original, ID em minúsculas, hash recebido comparado sem diferença de caixa. Nenhuma variante concede autorização.
- Verifica no runtime somente o booleano de igualdade com o fingerprint já comparado. Não expõe chave, Access Token, Authorization, cookies, corpo, dados do cliente ou URL de challenge.
- Erros do diagnóstico geram apenas `diagnostic_failed`. A resposta permanece **HTTP401**; não consulta Mercado Pago/banco, não processa evento, não muda pedido e não dispara CAPI.

Os hashes dos cabeçalhos permitem distinguir valores recebidos sem expor a assinatura completa que poderia compor uma requisição reproduzível. Os resultados não demonstram sozinhos quem modificou algum valor antes de chegar ao runtime. Se todas as comparações falharem e a chave carregada corresponder, será necessário investigar a assinatura produzida no emissor com os identificadores da entrega, sem concluir erro de credencial por exclusão.

## Verificação focada

Patch aplicado localmente e candidato final verificado antes do deploy, incluindo manifesto sem log em claro e expiração no minuto exato autorizado. ESLint focado e `git diff --check` aprovados. Candidato executado apenas em memória com TypeScript e módulo oficial `mercadopago@3.6.1`, obtido do npm, usando chaves/cabeçalhos fictícios e acesso de rede proibido no teste.

Nove cenários específicos passaram: assinatura com ID minúsculo; hash hexadecimal maiúsculo; `ts`/`v1` repetidos; request ID fora do formato permitido; outra Order; expiração da janela; cabeçalho excessivo; ambiente produção; falha criptográfica no diagnóstico. Os cenários do novo diagnóstico mantiveram bloqueio, escopo e ausência de exposição dos valores sensíveis. Não foi repetida a homologação financeira, Pix, replay ou a suíte completa.

## Próximo passo

Aguardar uma **futura entrega automática** da Order `ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT` (#1002), rejeitada por SignatureMismatch durante a janela. Pode ser uma reentrega de `order.canceled`, mas a ação não é lida nem assumida antes da assinatura. Correlacionar `lod_mp_signature_1002_v1` com a invocação pelo execution_id. A presença da instrumentação não comprova captura, não identifica sozinha a causa e não garante nova tentativa automática do provedor.

Na leitura do painel às aproximadamente 08:07 UTC em 21/09, Logs/Last hour mostrou No results found. O painel alerta para possível atraso de atualização. Nenhuma entrega foi provocada.

Não reenviar/simular notificações, criar pagamento, renovar token ou mexer em credenciais. Se não houver nova entrega automática durante a janela, a captura permanece pendente; não provocar entrega. Remover a instrumentação após a coleta. Sem Cloudflare/Sites publish, CAPI ou QZ. O HTTP401 permanece no ramo rejeitado; o fluxo previamente válido não foi alterado.
