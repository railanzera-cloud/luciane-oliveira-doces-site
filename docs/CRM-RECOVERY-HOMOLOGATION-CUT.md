# Corte de homologação — preparado, não executado

## Acesso técnico

`scripts/meta-linkage-readonly.mjs` consulta por GET o número (is_on_biz_app/platform_type), números da WABA, apps inscritos e assinatura do aplicativo/callback. Configuração exclusivamente por variáveis META_AUDIT_* no ambiente autorizado; tokens nunca em argumentos, URLs, logs, fixtures reais ou chat. Resultado contém somente indicadores. Listagem truncada, falta de permissão e falha de rede não certificam vínculo.

Esse diagnóstico não verifica sozinho overrides de callback por WABA nem compara os valores secretos da Edge implantada; esses dois pontos precisam de conferência interna autorizada. `ok` indica consistência das leituras de base, não autorização de ativação. Não usa credenciais visíveis em capturas. Não existe conexão autenticada Graph disponibilizada ao agente neste corte; não pedir novamente cadastro/prints para contornar isso.

## Impacto da instalação privada proposta

- Instalar somente o SQL preparado: um schema privado, uma tabela com FK para conversa e três RPCs service-only (gravação, leitura, expurgo limitado a registros expirados). Sem backfill ou cópia de histórico.
- Sem alteração de pedidos, pagamentos, estoque, permissões de equipe, triggers de atendimento, Edge ativa ou scheduler. Não envia nem habilita mensagens.
- ACL negada a anon/authenticated, RLS na tabela, search_path vazio e gate service_role nas RPCs. Sem gravação de corpo bruto ou telefone. Observações conflitantes para um mesmo ID são rejeitadas; repetição idêntica é idempotente.
- Leitura tem expiração; exclusão física é feita por RPC em lotes de até mil registros expirados. Nenhum agendamento de expurgo é instalado automaticamente.
- Reversão operacional: retirar a configuração opcional do store e revogar EXECUTE das novas RPCs, mantendo os dados privados para análise. Não remover tabela/schema nem apagar observações como rollback automático.
- Antes de aplicar: confirmar ausência de colisão de nomes, gerar migration versionada, conferir transação/ACL e autorização específica do proprietário. Depois: testar proibição anon/authenticated e leitura/gravação autorizada com conversa de teste; sem alterar clientes reais para testar consentimento.

## Ativação do echo

Pré-requisitos: vínculo técnico do mesmo app/WABA/número/callback, confirmação de Coexistence, overrides conferidos, envio bloqueado e estado anterior registrado. A condição ainda não foi declarada satisfeita neste corte.

Depois de satisfeita, o proprietário altera somente smb_message_echoes, mantendo messages e os outros campos como estavam. Não refazer onboarding, mudar fornecedor, callback ou token por tentativa. Testar inbound e resposta pelo App principal com dois contatos autorizados, conferir timestamps/IDs/dedupe e lembretes, e continuidade Tintim. A RPC existente pode reagendar lembretes; desativar a assinatura não desfaz esse efeito já gravado. O rollback da assinatura é feito pelo proprietário; ajustes do CRM exigem avaliação específica, sem exclusão em massa.

## Validação deste incremento

52/52 testes direcionados locais, incluindo PostgreSQL/PGlite real para persistência, rejeição de observação conflitante e expurgo idempotente. Verificador Graph testado com respostas sintéticas e GET-only; ainda sem execução autenticada contra a conta real. Sem instalação produtiva ou alteração Meta.
