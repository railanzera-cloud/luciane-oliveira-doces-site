# Corte candidato: ingresso autenticado e avaliação silenciosa

## Escopo e evidência

Primeiro teste aprovado pelo proprietário para transporte nos dois sentidos e continuidade visual no Tintim. Segundo telefone adiado; permanece pendente antes de qualquer liberação de mensagens automáticas. Não bloqueia este código isolado. Não reabrir auditoria cadastral concluída.

Código candidato no PR #67, não implantado: o index do webhook preserva validação HMAC, filtros, persistência core e resposta HTTP existentes. Depois do processamento bem-sucedido, um observer opcional usa `EdgeRuntime.waitUntil`. O classificador/persistência não passa a decidir a resposta à Meta. Erros e limite de execução de 25 segundos são contidos e registrados sem conteúdo privado.

Client servidor usa fetch/PostgREST nativo, como o webhook atual. Não acrescenta SDK ao runtime: permite somente SELECT de tabelas previstas e as três RPCs privadas. Credencial fica em headers para o mesmo projeto, com redirects proibidos. Ausência de contagem exata mantém os bloqueios do montador; erro não vira lista vazia bem-sucedida.

## Portas de ativação e efeito esperado

- `CRM_RECOVERY_SHADOW_ENABLED=true` e `CRM_RECOVERY_RETENTION_READY=true`, configurados apenas no servidor; ausentes significam OFF.
- `CRM_RECOVERY_AUTHORIZED_PHONES`: lista privada de até cinco números autorizados para o teste. Fora da lista, nenhuma observação semântica é capturada.
- `CRM_RECOVERY_CHANNEL_VERIFIED_SINCE`: data efetiva da cobertura comprovada; não transforma histórico anterior em verificado.
- Permissão/opt-out vêm do banco. Compra continua com `purchase_coverage_verified=false` neste corte; não afirmar ausência de compra quando o vínculo é incompleto.
- Observer valida novamente HMAC, resolve cliente e atendimento único, isola identidades por lote e reaproveita as observações privadas. Contatos/atendimentos ambíguos são ignorados com contagem; não se pede classificação à operadora.
- Cada resultado mantém `send_authorized=false`. Logs expõem somente estado e contagens por classificação, interesse reconhecido e motivos de impedimento com vocabulário fechado, sem telefone, mensagem, ID de conversa ou credenciais.
- Na entrada de interesse, reconhecer produto e salvar metadados; na resposta da loja, recuperar o interesse persistido e avaliar compra/permissão/disponibilidade/prazo. `not_due`, permissão desconhecida e compra não conciliada são impedimentos esperados, não falha do classificador.

O observer avalia em eventos; não é um executor periódico de acompanhamentos. A mesma função montadora aceita reavaliação sem novo payload, mas o executor periódico dessa avaliação ainda precisa de outro incremento. Não apresentar processamento de um echo como uma oportunidade elegível após o prazo ou como venda recuperada.

## Retenção proposta, sem aplicação

`supabase/prepared/recovery-retention-cron.sql` propõe reutilizar pg_cron: um job horário, no minuto 17, até dez lotes de mil expirados por execução. Não instala extensão nem substitui jobs existentes. Ajusta somente a função privada de expurgo para aceitar o owner postgres sem JWT quando chamada internamente pelo cron, além do service_role existente; mantém ACL negada a anon/authenticated e recusa outros usuários sem credencial.

Antes de habilitar captura: aplicar em migration autorizada, executar/testar manutenção, conferir cron.job_run_details, ausência de backlog vencido e observabilidade de falha. Expiração de leitura é imediata; eliminação física ocorre na próxima execução bem-sucedida. A purga defensiva em cada ingresso não substitui a manutenção horária durante períodos sem mensagens.

Nenhum job ou alteração de função foi instalado por este incremento.

## Impacto produtivo a aprovar

1. Migration pequena para função de expurgo e um job, restritos às observações privadas. Sem pedidos, pagamentos, estoque ou consentimento alterados.
2. Deploy coordenado do webhook candidato com TODOS os módulos locais transitivos, preservando verify_jwt e os segredos existentes. Começar com flags OFF e conferir processamento core.
3. Após retenção testada, habilitar modo sombra apenas para o telefone já autorizado e registrar o horário de corte. Não alterar Meta/callback/Tintim.
4. Teste real autorizado com menção explícita a produto; conferir gravação privada sem corpo, resposta/echo e classificação interna. Sem preencher opt-in ou pagamento para facilitar o teste.

## Reversão

- Desligar SHADOW_ENABLED interrompe novas avaliações; as mensagens continuam no ingresso core.
- Se houver regressão do webhook, restaurar os três arquivos da v8 a partir de `8bf903388379b9c2783aca2d11bec6bead096ec9`. Correspondência byte a byte com a Edge ativa foi conferida para index.ts/core.mjs/status-core.mjs. Preservar verify_jwt e segredos. As duas flags permanecem OFF.
- Desativar somente o novo job por nome para suspender manutenção. Não desfazer observações/remover tabela nem reverter mensagens/lembretes antigos por exclusão em massa.
- Um background task já iniciado pode concluir antes do desligamento; não prometer cancelamento retroativo. Timeout impede novas requisições desse task.

## Testes

63/63 testes direcionados locais aprovados: ingresso habilitado/desabilitado, retenção, assinatura, escopo autorizado, ambiguidades, falha contida, protocolo PostgREST, core de mensagens/status e PostgreSQL real para a persistência. Tipagem Deno estrita passou com declaração local de EdgeRuntime: o carregamento direto do pacote de tipos JSR falhou por rede neste ambiente; a substituição temporária foi removida e não altera o fonte. Não equivale a teste de runtime implantado.

Sem implantação, agendamento, mensagem real, merge ou Cloudflare neste incremento.
