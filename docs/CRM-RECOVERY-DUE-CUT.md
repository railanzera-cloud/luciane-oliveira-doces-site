# Reavaliação privada após o prazo — candidato PR #67

> Plano histórico superado para agendamento/autenticação. A recomendação de suporte para ACLs pg_net foi corrigida conforme documentação oficial. O candidato vigente é [Worker Cron com HMAC restrito](CRM-RECOVERY-CLOUDFLARE-SCHEDULER.md), ainda não implantado. As regras comerciais e a estrutura privada continuam válidas; o SQL legado de cron agora falha explicitamente.

Atualização do corte autorizado em 16/11/2026: estrutura privada instalada e Edge autenticada implantada OFF. A ativação periódica foi interrompida por ACLs de pg_net que o usuário SQL postgres não consegue revogar. pg_net foi removida por rollback antes de guardar credenciais ou enviar requisições. Nenhum cron novo foi criado. Webhook mantém exatamente o código homologado da v13 (versão de implantação 15 após mudança/restauração de flags), no telefone original. Ver detalhes no final. As seções de fluxo/corte abaixo descrevem a preparação, não uma homologação periódica concluída.

## Fluxo preparado

1. Um único job proposto, a cada cinco minutos, chama `crm-recovery-reevaluate`. Não há um cron por cliente. A Edge exige JWT e o Bearer de serviço; corpo HTTP não define escopo, consentimento, fatos ou flags.
2. `CRM_RECOVERY_DUE_ENABLED` é OFF por padrão e depende também de SHADOW_ENABLED e RETENTION_READY. A lista privada atual de telefones autorizados permanece a única origem de escopo; este corte não autoriza ampliá-la.
3. A RPC seleciona apenas lembretes existentes pendentes e vencidos, atendimento esperando cliente, observação recente e contato dentro do escopo. Não altera a fila comercial existente. Se houver duplicidade de lembretes pendentes, considera somente o mais recente por prazo/ID.
4. Uma linha privada por lembrete, advisory lock transacional e `FOR UPDATE SKIP LOCKED` impedem duas reservas simultâneas. Lease de 90 segundos admite recuperação após queda. Lote máximo de cinco; timeout HTTP de 25 segundos. Falhas de fonte têm repetição após dois minutos, aumentando para trinta após cinco falhas. A execução periódica efetiva ocorre no próximo tick do job, não exatamente no segundo do vencimento.
5. O mesmo montador relê observações, mensagens/echoes, pedidos, pagamentos, flags de abertura, disponibilidade, estoque após reservas e autorização auditada. Não precisa de texto novo ou classificação manual.
6. Uma revisão opaca das fontes é capturada antes e conferida ao concluir. Pagamento, cancelamento, atividade, permissão, disponibilidade ou outra mudança descarta o resultado. A decisão possui validade de dois minutos; a leitura privada também recalcula a revisão e devolve evidência insuficiente se ficar desatualizada. Não há caminho de envio.

## Evidências e impedimentos

| Tema | Integração preparada | Limite preservado |
|---|---|---|
| Prazo sem mensagem nova | Lê `crm_follow_ups.due_at` e reavalia com relógio atual e intervalo configurado | Job/Edge ainda não implantados; tolerância do tick de cinco minutos |
| Histórico antigo | Episódio começa no interesse observado após certificação do canal; supressões conhecidas no horizonte lido continuam consideradas | Mensagem inbound posterior sem conteúdo semântico confiável e horário Tintim não comprovado continuam bloqueando cobertura |
| Pedidos e pagamentos | Produtos estruturados continuam no catálogo; pedidos por telefone normalizado e vínculos Tintim. Busca também pedidos antigos com pagamento recente | Pedido criado, entregue ou fala de pagamento não viram pagamento confirmado. Vínculo candidato exige conciliação |
| Ausência de compra | Sucesso da leitura do site é distinguido da cobertura de vendas externas | Pedidos sem identidade e vendas externas não certificadas continuam impedindo afirmar ausência de compra; flag de cobertura não é ligada artificialmente |
| Loja | Reutiliza `store_settings/orders_open`, a mesma fonte do checkout | `store_closed` significa fechamento explícito; dado ausente vira `store_not_verified_open`. Não existe calendário comercial verificado a integrar neste corte; não inventar horário pelo relato de um atendimento |
| Disponibilidade | Flags canônicas de todas as categorias, mais `public_crocante_inventory` após reservas para pacotes | Fonte de estoque ausente/negativa/duplicada não vira disponibilidade. Pré-encomenda não é convertida em disponibilidade imediata |
| Permissão | Grant atual com data válida, evidência e registro correspondente na auditoria de ação da equipe | Interesse, compra e janela de atendimento não criam opt-in. Sem grant auditado, mantém permission_unverified. Nenhuma coleta nova/atualização de consentimento foi implementada |
| Segurança temporal | Releitura no vencimento, versão das fontes ao concluir e ao ler, leases e repetição limitada | Consistência otimista para sombra. Mesmo uma candidata não autoriza envio e precisaria de outra verificação no futuro preflight de envio |

A cobertura certificada é recente e delimitada. Não promete histórico integral, captura de todo conteúdo multimídia ou supressão global indefinida a partir de observações que expiram. Opt-out persistente no cadastro continua prioritário. Antes de qualquer piloto de envio, homologar também propagação durável de recusas/opt-out e cobertura dos canais externos. Não liberar clientes apenas removendo esses bloqueios.

## Privacidade e instalação SQL

Migration candidata `20261116155426_crm_recovery_due_shadow.sql`, gerada pela CLI e testada somente em PostgreSQL local:

- Uma tabela `crm_recovery_private.due_checks`, RLS e sem acesso direto de anon/authenticated/service_role. Retenção de sete dias. Sem JSON arbitrário, texto de conversa, telefone, nome ou evidência livre. Classificação e array de motivos têm vocabulário fechado; send_authorized possui CHECK=false.
- RPCs service-only para permissão, reserva, conclusão e leitura; função interna de revisão sem EXECUTE para chamadores da API. Evidência e autor da permissão permanecem na auditoria existente e não são copiados.
- Expurgo existente estendido para a nova tabela: até mil observações e mil avaliações vencidas por chamada. O cron de retenção existente não é alterado. Seu limite já existente de dez chamadas permite até vinte mil remoções no caso de backlog das duas tabelas; leituras recusam expirados imediatamente.
- Nenhuma tabela comercial, pedido, pagamento, estoque ou agendamento produtivo é atualizado pela migration. Não cria trigger de WhatsApp ou permissões artificiais.

## Corte produtivo proposto — depende de autorização

1. Backup da v13/configuração e dos três jobs atuais. Instalar a migration, testar ACL/RLS e RPCs em transação revertida, manutenção, ausência de dados livres e reversibilidade. Não começar capturas de outros contatos.
2. Habilitar `pg_net` somente após autorização específica: `pg_cron` e Vault estão instalados, mas pg_net não está. A extensão permite HTTP assíncrono a partir do Postgres e será restrita ao uso administrativo necessário, com ACLs conferidas; não configura disparos WhatsApp. Depois implantar a nova Edge com verify_jwt=true e DUE_ENABLED=false. Preservar segredos e flags de envio. Instalar somente o job novo INATIVO usando `supabase/prepared/recovery-due-cron.sql`.
3. Preparar as duas referências privadas do Vault: URL do projeto e credencial de serviço existente. Não colocar valores em SQL público, cron.command, documentação, chat ou logs. Configuração segura será verificada no momento do corte; não exportar credenciais por consultas de diagnóstico.
4. Atualizar o webhook com os módulos compartilhados novos somente após a RPC de permissão existir. `index.ts`/HMAC/core/status não são modificados por este incremento. Desligar SHADOW antes do deploy e restaurar somente o escopo já autorizado após smoke.
5. Conferir recebimento, RPCs, dados sintéticos em rollback, DUE_ENABLED e escopo. Ativar somente o novo job e a flag de reavaliação. Usar a observação real já autorizada se ainda estiver no horizonte de 24 horas; não alterar due_at nem fabricar pagamento/permissão para o teste.
6. Comprovar chamada periódica, reserva, decisão e leitura com fontes atuais depois do vencimento, sem uma nova mensagem. Classificação bloqueada por motivo real também comprova execução; não é venda recuperada.

## Monitoramento e reversão

- Cron.job_run_details confirma o disparo SQL, **não** o sucesso da Edge. Conferir também status/resposta de pg_net e resumo `recovery_due`, além da leitura service-only das decisões. Não consultar/publicar headers das filas HTTP, segredos do Vault ou corpo de conversas.
- HTTP 503/contadores de falha indicam erro de fonte/conclusão. Leases expirados voltam a ser elegíveis, sem duas conclusões válidas com o mesmo token. Nenhum resultado antigo serve como autorização.
- Reversão: DUE_ENABLED=false e desativar somente `lod-recovery-shadow-due-5min`. SHADOW_ENABLED=false suspende também a avaliação no ingresso. Se necessário, restaurar os quinze arquivos da v13 a partir da base do PR antes deste incremento, mantendo verify_jwt=false no webhook e seus segredos. Não restaurar versões antigas do checkout ou do site.
- Manter estrutura aditiva e expurgo durante a retenção dos registros, evitando DROP ou perda de evidências. Os demais jobs ficam intactos. Não remover pg_net automaticamente no rollback: primeiro conferir dependências e filas em andamento. Uma execução já em curso pode terminar antes do timeout; desligamento não cancela retroativamente resultados.

## Validação

72 testes direcionados locais passaram: permissões/RLS em PostgreSQL/PGlite real, vencimento, escopo, lease, reenvio do mesmo token, mudanças de fonte, retry, leitura de resultado obsoleto, expiração, permissão auditada, estoque, pagamento recente de pedido antigo, histórico e transporte. Typecheck Deno da nova Edge passou sem o import de tipos JSR na cópia temporária; fonte original permanece com o import, sem implantação. Tipagem não substitui homologação de runtime/cron.


## Resultado efetivo do corte autorizado

- Migrations no registro comercial: 20261116155425 (tentativa pg_net), 20261116155426 (estrutura privada) e 20261116155821 (rollback pg_net). Arquivos foram renomeados dos timestamps gerados pela CLI para os timestamps registrados pelo servidor; conteúdo operacional reconciliado. Não repetir migrations já instaladas.
- pg_net 0.20.4 criou objetos pertencentes a supabase_admin. REVOKEs emitidos pelo postgres não retiraram grants do proprietário; consultas has_*_privilege continuaram true para papéis públicos. Postgres não é membro do proprietário e não tem grant option. Não interpretar sucesso da ferramenta de migração como hardening comprovado.
- Sem credencial no Vault/filas, sem requisições pg_net e sem cron novo. DROP EXTENSION RESTRICT autorizado executou com sucesso após conferir filas vazias. Nenhum dado comercial foi removido.
- RLS/ACL e testes transacionais produtivos passaram: apenas service_role executa as RPCs; anon/authenticated não acessam tabela/RPC, reserva duplicada recusada, token inválido e lease expirado recusados, retomada e expurgo da linha de teste comprovados. ROLLBACK deixou zero avaliações; prazos/permissões/pagamentos comerciais não foram alterados.
- Edge crm-recovery-reevaluate v2 ACTIVE, verify_jwt=true, flag DUE=false. POST sem Authorization retornou 401 no gateway. Nenhuma chamada autenticada nem decisão periódica real foi executada. Sempre send_authorized=false no código e CHECK da tabela.
- Webhook não recebeu módulos candidatos neste corte interrompido. Código e hash homologados preservados; SHADOW=true restaurado para o mesmo escopo, RETENTION=true, DUE=false. Três jobs anteriores intactos, envios false, zero tentativas.
- Dependência concreta: suporte/plataforma deve aplicar ACLs com o proprietário dos objetos pg_net, preservando administração interna e concedendo ao postgres somente os acessos necessários ao job. Não conceder supabase_admin ao agente. Conferir negação efetiva para anon/authenticated/service_role e privilégios do executor antes de inserir credencial ou instalar job. O SQL preparado agora falha se essas ACLs não estiverem restritas.
- Não pedir nova mensagem ou alterar o vencimento para produzir uma prova artificial. A oportunidade original continua a única referência; ainda não houve homologação periódica.
