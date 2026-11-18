# Echo — homologação operacional preparada

As verificações autenticadas de ativos/Coexistence e callback foram concluídas pelo proprietário por GET e aceitas como evidência desta etapa. Não repetir cadastro ou solicitar credenciais. Identificadores e resultados privados não são publicados aqui.

Preflight técnico separado confirmou Edge ativa com parser de echo e RPC disponível, envio automático desligado e ausência de tentativas de entrega. O proprietário pode ativar somente `smb_message_echoes`, preservando `messages`, callback e os demais campos. Não há alteração de assinatura pelo agente.

## Teste acompanhado

1. Proprietário registra estado anterior, ativa apenas o campo e informa que ativou.
2. Telefone autorizado envia uma mensagem simples de teste ao número comercial. Registrar horário local com fuso; responder pelo WhatsApp Business do aparelho principal.
3. Conferir evento inbound e app_echo associados ao contato autorizado, horários e gravação. Conferir que a conversa permanece normal no App e aparece no Tintim. Agregados sozinhos não comprovam identidade dos contatos.
4. Conferir mudança esperada em last_outbound/status e eventual cancelamento/reagendamento de lembrete pela RPC existente. Nenhum lembrete deve ser interpretado como mensagem enviada.
5. Repetir com segundo telefone autorizado. Se necessário, cliente responde novamente para conferir supressão do acompanhamento. Não fabricar consentimento nem pagamento.
6. Se faltarem eventos ou houver falha operacional, restaurar somente a assinatura ao estado anterior. Reverter a assinatura não desfaz alterações de lembretes já gravadas. Não reconectar o Tintim ou migrar número por tentativa.

Probe SQL somente leitura em `tests/homologation/echo-monitor-readonly.sql`. Linha de base privada obtida na sessão de homologação, fora do GitHub. O monitor não cria cron e não executa consultas em segundo plano: será consultado após cada etapa informada pelo proprietário.

## Desenvolvimento em paralelo

Corrigido o montador para lotes Meta com mais de um cliente: a assinatura é validada e somente os eventos da identidade exata da conversa são utilizados/persistidos. Lote sem evento correspondente continua rejeitado. Novo teste verifica que opt-out de outro cliente não contamina a conversa e que texto estrangeiro não é persistido.

54/54 testes direcionados locais aprovados. Sem deploy da Edge, merge ou Cloudflare. A Edge atual captura horários/direções e não está conectada ao novo classificador/store; primeiro homologar transporte real, depois realizar o corte separado da avaliação silenciosa e do expurgo. O teste de entrada/echo sozinho não comprova classificação, elegibilidade ou recuperação de receita.
