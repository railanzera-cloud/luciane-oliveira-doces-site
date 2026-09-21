# Proposta de diagnóstico sanitizado — #1002

Estado: **preparada, NÃO aplicada e NÃO publicada**. Base funcional: `02cf935`.

## Evidência nova

Em 21/09/2026 o operador retornou `IGUAIS` e uma captura do cálculo local com entrada oculta. A chave de assinatura de teste copiada do Mercado Pago corresponde ao SHA-256 do `MP_WEBHOOK_SECRET_TEST` configurado no Supabase. Digest informado pelo operador: `e922f1fee5c9017f750266955ee129be10b171a5cfb9dcaded6e6efc7ffc15a2`; atualização exibida no Supabase: `16/09/2026 00:19:36 UTC`.

A hipótese de divergência entre os valores atuais comparados está descartada. Não pedir nova conferência nem substituir credenciais. O valor carregado na execução histórica não foi observado diretamente. A proposta abaixo verifica apenas igualdade do fingerprint dentro de uma futura execução, sem registrar o secret ou seu valor em texto.

## Limite de observação

O webhook atual registra apenas o motivo `SignatureMismatch`. Os metadados de invocações e o painel Mercado Pago já consultados não guardam os cabeçalhos necessários para reconstruir a assinatura antiga. Não há recuperação retroativa desses valores pelas evidências disponíveis.

O arquivo `tools/homologacao/diagnostico-assinatura-1002.patch` é uma proposta separada. Ele não faz parte da função executada. O código local de `supabase/functions/mercadopago-webhook/index.ts` continua idêntico a `02cf935`, e nenhuma função remota foi alterada. Aplicar/publicar o patch exige autorização específica porque o usuário determinou **não alterar webhook nesta etapa**.

## Escopo exato proposto

- Executa somente no bloco que já rejeitou uma assinatura com `SignatureMismatch`, com ambiente `test` e ID exato `ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT`.
- Janela fixa termina em **23/09/2026 07:49:19 UTC**. Se a autorização ocorrer depois desse prazo, revisar somente a janela antes de propor aplicação. Não desativar o limite silenciosamente.
- Cabeçalhos limitados a 2048 caracteres (`x-signature`) e 200 (`x-request-id`). Mantém a rejeição normal se excederem os limites.
- Lê apenas os dois cabeçalhos já usados pelo validador. Registra SHA-256/comprimentos, transformação de espaços, `ts` numérico, contagem de `ts`/`v1` e formato/caixa do hash. Não registra o `v1` nem qualquer HMAC calculado.
- Registra `x-request-id` apenas se tiver formato UUID. Reconstrói em memória o manifesto exato com as mesmas regras do SDK 3.6.1; grava o manifesto somente quando composto pelo ID fixo, request UUID e timestamp numérico. Fora desse formato, registra apenas hash do manifesto; não corrige ou normaliza dados para fazê-los parecer UUID.
- Recalcula HMAC-SHA256 em memória e retorna aos logs somente resultados booleanos: manifesto original, ID em minúsculas, hash recebido comparado sem diferença de caixa. Nenhuma variante concede autorização.
- Verifica no runtime somente o booleano de igualdade com o fingerprint já comparado. Não expõe chave, Access Token, Authorization, cookies, corpo, dados do cliente ou URL de challenge.
- Erros do diagnóstico geram apenas `diagnostic_failed`. A resposta permanece **HTTP401**; não consulta Mercado Pago/banco, não processa evento, não muda pedido e não dispara CAPI.

Os hashes dos cabeçalhos permitem distinguir valores recebidos sem expor a assinatura completa que poderia compor uma requisição reproduzível. Os resultados não demonstram sozinhos quem modificou algum valor antes de chegar ao runtime. Se todas as comparações falharem e a chave carregada corresponder, será necessário investigar a assinatura produzida no emissor com os identificadores da entrega, sem concluir erro de credencial por exclusão.

## Verificação da proposta

Patch verificado com `git apply --check`, sem aplicação. Candidato executado apenas em memória com TypeScript e módulo oficial `mercadopago@3.6.1`, obtido do npm, usando chaves/cabeçalhos fictícios e acesso de rede proibido no teste.

Nove cenários específicos passaram: assinatura com ID minúsculo; hash hexadecimal maiúsculo; `ts`/`v1` repetidos; request ID fora do formato permitido; outra Order; expiração da janela; cabeçalho excessivo; ambiente produção; falha criptográfica no diagnóstico. Os cenários do novo diagnóstico mantiveram bloqueio, escopo e ausência de exposição dos valores sensíveis. Não foi repetida a homologação financeira, Pix, replay ou a suíte completa.

## Próximo passo condicionado

Solicitar autorização somente para aplicar/publicar esta instrumentação temporária, mantendo a validação financeira intacta. Se autorizada, comparar novamente o código remoto antes de aplicar; a última cópia publicada conhecida difere do repositório apenas por um ponto e vírgula. Observar uma **futura entrega automática** do #1002 e correlacionar o novo marcador `lod_mp_signature_1002_v1` pelo execution_id da invocação.

Não reenviar/simular notificações, criar pagamento, renovar token ou mexer em credenciais. Se não houver nova entrega automática durante a janela, a captura permanecerá pendente; não provocar entrega sem nova instrução. Remover a instrumentação após a coleta. Sem Cloudflare/Sites publish, CAPI ou QZ.
