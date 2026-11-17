# Agendamento Cloudflare da reavaliação — corte parcial autorizado

Estado em 17/11: autenticação da Edge homologada por verificador local; Cron real chegou ao Worker com flag OFF. A primeira tentativa Worker→Edge falhou com scheduler_unavailable. Correção candidata abaixo testada em workerd e preparada no PR, ainda sem homologação Cloudflare após a troca. Não ativar DUE nem envios.

## Decisão e correção da premissa anterior

Usar um Worker com Cron Trigger de cinco minutos como relógio externo. Preservar a Edge de reavaliação, fila privada, RPCs comerciais, leases, deduplicação, catálogo e regras de avaliação. Não alterar o webhook homologado para implantar este mecanismo de agendamento.

A recomendação anterior de solicitar ao suporte a restrição individual das ACLs de pg_net estava incorreta. A documentação oficial explica que os grants são padrão da plataforma e não oferece essa alteração por projeto. O rollback anterior permanece correto diante da condição de segurança adotada naquele corte, mas não constitui prova de exploração nem de exposição pela Data API.

| Alternativa | Evidência e limite | Decisão |
|---|---|---|
| pg_net padrão | Consulta somente leitura não encontrou LOGIN customizado. Papéis API sem LOGIN não equivalem a acesso SQL direto. Entretanto, usuários com LOGIN podem acessar a fila HTTP; parâmetros SQL consultados não comprovaram a lista de schemas expostos. A fila levaria credenciais do agendamento | Possível sob outro modelo de risco, mas exige aceitar essa superfície residual; não insistir em ACLs indisponíveis |
| Worker Cron | Segredo dedicado assina somente um comando fixo; nenhuma chave administrativa, conversa, telefone ou pedido atravessa o Worker | Recomendado: elimina fila HTTP e Vault do agendador, mantendo todo processamento comercial no Supabase |

Fontes oficiais consultadas em 16/11/2026:
- https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16
- https://supabase.com/docs/guides/functions/auth-headers
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/

## Autenticação e limites

O candidato mantém `verify_jwt=true` na Edge e adiciona HMAC-SHA256 obrigatório. A chave pública no header `apikey` atende ao gateway conforme a compatibilidade documentada; não autoriza o chamador. Sua aceitação efetiva deve ser comprovada no corte com avaliação desligada. Se o gateway rejeitar a configuração, interromper o corte; não desligar a validação para contornar o teste.

| Ambiente | Configuração | Poder |
|---|---|---|
| Worker | URL do projeto e chave publishable pública; aceita também chave anon legada, nunca service_role | Alcançar somente a Edge fixa |
| Worker + Edge Secrets | Segredo HMAC dedicado de 32 bytes aleatórios, base64url | Assinar/verificar exclusivamente a chamada de reavaliação |
| Edge | `CRM_RECOVERY_AUTH_MODE=scheduler_hmac_v1`, chave pública esperada e segredo dedicado | Rejeitar chave pública isolada, assinatura inválida e antigo Bearer administrativo sem HMAC |
| Edge existente | service_role interna e lista privada de telefones autorizados | Consultar fontes e RPCs existentes; não compartilhar com Worker |

O comando contém apenas versão, ação fixa e instante UTC do tick. Não aceita telefone, escopo, fatos comerciais, permissões ou flags. Assinatura vincula método, destino canônico, corpo, timestamp e nonce UUID. Validade: 90 segundos no passado e 30 no futuro; tick alinhado em cinco minutos, até dez minutos antigo. Relógios divergentes falham fechados.

Após assinatura válida, RPC service-only consome atomicamente nonce e tick únicos. Nova assinatura para o mesmo tick também é rejeitada. O consumo ocorre mesmo com avaliação OFF, permitindo homologar autenticação/replay sem avaliar atendimentos. O registro contém somente nonce, tick e datas, expira em uma hora e é removido pelo expurgo horário existente, sem alterar seu agendamento. A migração candidata acrescenta essa tabela privada com RLS, ACLs e função; o expurgo passa a remover até mil registros por tabela por chamada, três tabelas no total. Leituras comerciais e validade das observações continuam inalteradas.

O Worker não expõe rota HTTP (`workers_dev=false`, `preview_urls=false`, nenhum route), segue redirecionamentos nunca, limita corpo/resposta/tempo e publica apenas estados e contadores fechados. Falhas não imprimem exceções, headers, URL configurada, assinaturas, segredos ou resultados comerciais. Não há retry imediato: o próximo tick e os leases controlam retomada. Uma execução em curso pode terminar após desligamento; não existe caminho de envio.

## Corte proposto — exige nova autorização

1. Registrar fonte, hash, versão e `verify_jwt` da Edge atual; confirmar flags de envio OFF, DUE OFF e lista privada original sem ampliá-la. Preservar webhook e três agendamentos SQL existentes.
2. Aplicar somente `20261116164957_crm_recovery_scheduler_auth.sql`. Validar RLS/ACLs, RPC, unicidade, expiração e extensão do expurgo. Não reinstalar migrations anteriores, pg_net ou Vault.
3. Gerar segredo aleatório em ambiente seguro autorizado; inserir diretamente em Cloudflare Secrets e Supabase Edge Secrets. Nunca usar argumento CLI, SQL versionado, commit, resposta ou log contendo o valor. Configurar chave pública e modo de autenticação; DUE continua OFF.
4. Implantar somente a Edge de reavaliação candidata com `verify_jwt=true`. Testar: sem credenciais 401 no gateway; chamada válida 200/disabled e `send_authorized=false`; assinatura inválida ou Bearer isolado rejeitados; repetição do tick 409; falha do ledger indisponível e sem avaliação. A resposta positiva autenticada no gateway real é condição obrigatória, ainda não comprovada localmente.
5. Implantar Worker com cron vazio e flag OFF, conforme arquivo versionado. Validar bindings, ausência de rotas e de chaves administrativas. Testar uma chamada assinada controlada com Edge OFF, sem imprimir pedido HTTP. O dry-run local não prova permissões/conta Cloudflare nem aceitação real do gateway.
6. Só após sucesso: manter SHADOW/RETENTION e lista original, habilitar DUE na Edge e `RECOVERY_SCHEDULER_ENABLED=true`; configurar exclusivamente `*/5 * * * *` neste Worker. Não modificar outros Workers, Pages, Meta ou Tintim.
7. Acompanhar tick posterior por registro Cloudflare, resumo Edge, fila privada e decisão recente: interesse restaurado, prazo original, consultas comerciais novas e motivos atuais. Nenhum telefone passa pelo Worker. Verificar send_authorized=false, zero tentativas de envio e transporte preservado. Aguardar execução real: invocação manual não comprova periodicidade.
8. Usar a oportunidade anterior somente se ainda estiver válida pelo relógio e pelas regras reais. Caso tenha expirado, registrar o impedimento e solicitar posteriormente outro teste autorizado; nunca fabricar horários, permissões, pagamento ou elegibilidade.

Impacto: um Worker independente, uma pequena tabela privada e uma RPC de autorização, extensão do expurgo existente e substituição da autenticação do chamador na Edge de reavaliação. Até 288 ticks/dia, um comando por tick, lotes de até cinco; regras e consultas comerciais existentes permanecem no servidor. Não cria agendamento SQL, não ativa envio e não concede consentimento.

Riscos residuais: segredo HMAC comprometido permite solicitar avaliações restritas, sem escolher contatos ou enviar; chave pública isolada não basta. Falha/atraso do Cron adia avaliação até outro tick; 409 é esperado para tick já consumido. Rotação deve pausar Cron e DUE, trocar o segredo nos dois lados, testar OFF e retomar no tick seguinte. A propagação do Cron e a integração autenticada exigem observação real após autorização.

## Reversão

Desligar flag do Worker e remover exclusivamente seu Cron; desligar DUE na Edge. Se necessário, restaurar fonte/configuração de autenticação da Edge anterior com JWT obrigatório, mantendo DUE OFF. Não alterar webhook, checkout ou outros jobs. Preservar tabelas privadas e expurgo para evidências; rollback operacional não exige DROP nem perda de dados. Revogar/rotacionar o segredo dedicado após parar ambos os lados. Registrar falhas apenas por código opaco. A restauração do corpo anterior de purge é necessária antes de eventual remoção futura da tabela, fora deste corte.

## Validação isolada

Build e 994 regressões comerciais aprovados. 82 testes direcionados aprovados, incluindo assinatura independente, destino/tempo/corpo, replay com nonce diferente no mesmo tick, recusa de credenciais administrativas no Worker, timeout, ausência de classificação/envio antes da autenticação, RLS/ACLs e expurgo em PostgreSQL local. Typecheck Deno da entrada passou. Bundle Wrangler 4.92.0 em dry-run passou com único binding OFF e nenhum segredo. Testes usam somente fixtures sintéticas. Nenhum teste autenticado nem implantação desta alternativa foi executado em produção.

A homologação periódica permanece pendente. Permissão auditada ausente, loja fechada ou não comprovada, indisponibilidade, resposta posterior, identidade/pagamento sem conciliação e cobertura não certificada de vendas externas continuam bloqueios comerciais legítimos; este agendador não os remove artificialmente.

Limite da checagem global: `tsc --noEmit` retorna os mesmos quatro diagnósticos na base anterior e no candidato (tipagem do seletor de estoque e tipos Cloudflare/D1/Fetcher). Comparação executada em worktree separada da base, com as mesmas dependências. Não foram introduzidos por este incremento; Deno da Edge e bundle do novo Worker passam. A suíte ampla foi repetida após instalação completa das dependências; uma tentativa anterior sem dependências completas não era uma regressão válida.

## Corte autorizado — 16/11/2026, etapa privada concluída

Migração registrada como `20261116164957_crm_recovery_scheduler_auth.sql`; arquivo reconciliado com timestamp do registro do Supabase, sem mudar SQL. Baseline da Edge v2/JWT obrigatório, webhook v15/código v13, flags e hashes dos três jobs preservado fora do repositório público. DUE=false, SHADOW/RETENTION=true, digest da lista privada original inalterado. Nenhuma chave HMAC foi gerada ou gravada nesta etapa.

Testes reais de banco, em transação revertida: nonce válido aceito; repetição do nonce e do tick rejeitadas; timestamp expirado/futuro, tick antigo/desalinhado rejeitados; expurgo removeu somente o registro sintético vencido do teste; rollback deixou ledger vazio. RLS ligada; anon/authenticated sem EXECUTE da RPC e sem SELECT/INSERT da tabela; service_role sem acesso direto à tabela e com RPC permitida. Revogação do EXECUTE e restauração por rollback comprovadas. Três jobs com mesmos IDs, horários, flags e hashes de comando; pg_net ausente. Envios OFF e zero tentativas.

Preflight HTTP real contra a Edge anterior v2: sem autorização, 401 JSON do gateway (UNAUTHORIZED_NO_AUTH_HEADER); com apikey pública somente, 401 textual da aplicação (unauthorized). Isso comprova passagem dessa chave pública pelo gateway com verify_jwt=true e recusa da aplicação, mas não comprova ainda HMAC válido, rejeição de adulteração/replay via HTTP ou execução periódica. Nenhuma avaliação foi solicitada por esses probes.

Ponto de retomada: configurar o segredo dedicado. O conector Supabase não disponibiliza escrita de Edge Secrets; CLI local não está autenticada e não há credencial de implantação Cloudflare configurada. O painel Supabase está autenticado. A entrada/salvamento de nova credencial pelo navegador requer intervenção direta do usuário. Não extrair sessão do navegador nem transferir credenciais para comandos. A Edge candidata e o Worker ainda não foram implantados; cron segue inexistente e DUE OFF. Aguardar essa configuração segura, sem nova autorização de escopo.

Reversão no estado atual: nenhuma restauração de Edge ou cron é necessária, pois ambos continuam anteriores. Manter tabela privada vazia e expurgo estendido; não executar DROP. Baseline privado preserva corpo anterior do expurgo caso uma reversão estrutural futura seja necessária.


## Correção de compatibilidade do Worker — 17/11/2026

Evidências: operador recebeu 401 para credenciais ausentes/inválidas, adulteração e expiração; assinatura válida recebeu 200/disabled com send_authorized=false; replay de nonce e do tick recebeu 409. Consulta privada independente confirmou um único consumo e zero avaliações/tentativas. Na Cloudflare, acionamento das 13h50 America/Belem registrou disabled; o das 13h55 registrou scheduler_unavailable e recovery_scheduler_failed. Nenhum novo consumo no Supabase no diagnóstico posterior. Ambos os endereços públicos do Worker foram desligados conforme relato do operador; conferir novamente antes de declarar corte concluído.

Causa comprovada em teste isolado: Request com redirect:error lança TypeError no workerd antes do HTTP; o dry-run anterior somente empacotava e os testes anteriores usavam Request do Node. Documentação oficial vigente confirma a incompatibilidade: https://developers.cloudflare.com/workers/runtime-apis/request/ . Corrigidos Request e fetch para manual. Toda resposta 3xx é rejeitada explicitamente, sem seguir Location ou transferir assinatura, chave pública ou corpo a outra origem. HMAC, alvo fixo, JWT, nonce/tick, permissões e decisões comerciais inalterados.

Também explicitado ignoreBOM:false com fatal:true e gerado dashboard-worker.mjs automaticamente pelos mesmos módulos, exportando somente o handler padrão. O runtime local fixado no lockfile rejeitava constantes exportadas como entrypoints; remover exports internos do bundle não modifica o protocolo. A geração tem verificação de igualdade na CI, evitando divergência por cópia manual. Falhas agora incluem apenas etapa fechada sign/fetch/read, nunca exceção, headers ou segredo.

Validação executada: build e 996 regressões comerciais, incluindo 84 testes direcionados; novo teste Miniflare/workerd do lockfile (compatibilityDate 2026-05-15) reproduziu a falha legada e passou a chamada assinada real entre Worker local e handler Edge OFF sintético, além de OFF sem HTTP, fetch público 404 e rejeição de 307 sem segunda requisição. Testes Node cobrem 301/302/303/307/308 sem encaminhamento. Tudo usa dados sintéticos e intercepta a saída, sem requisição a clientes ou produção. Isso não substitui homologação no runtime Cloudflare do operador.

Implantação manual restrita: definir RECOVERY_SCHEDULER_ENABLED=false na Cloudflare e manter CRM_RECOVERY_DUE_ENABLED=false; substituir integralmente pelo arquivo gerado e implantar; conferir zero diagnósticos. Depois habilitar apenas o Worker para testar o tick real com Edge OFF, esperando edge_disabled e consumo privado correspondente. Só liberar DUE após essa evidência, controle do único telefone e verificação comercial atual. Não recriar Cron, não trocar segredos, não publicar Pages nem implantar webhook/Edge por causa desta correção. A Edge existente verifica o mesmo protocolo; a função sign alterada não é usada pelo handler receptor.

Reversão: Worker flag false, manter DUE false; preservar único Cron para diagnóstico desligado ou removê-lo se necessário. Não restaurar o Worker incompatível como solução nem abrir endpoints de teste em produção. Foi solicitado retorno da flag do Worker a false no diagnóstico; a execução dessa ação pelo operador ainda não foi confirmada ao preparar o candidato.
