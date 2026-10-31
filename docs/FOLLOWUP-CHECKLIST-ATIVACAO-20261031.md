# Follow-up assistido — procedimento de ativação e rollback

**31/10/2026 — Luciane Oliveira Doces — America/Belem**

**Decisão atual: NÃO publicar o ZIP nem aplicar a migração original sozinha.** A homologação técnica foi executada; a ativação comercial depende de horários originais por mensagem e consentimento verdadeiro. Nenhuma operação deste procedimento foi aplicada à produção nesta execução.

## Versões e evidências

| Item | Identificação |
|---|---|
| Projeto comercial | `railanzera-cloud/luciane-oliveira-doces-site` |
| Supabase comercial | `edqiwvccmboyayojvuea` |
| Frontend aprovado | `f729cf5ab00633d6d564f101099ce8b76b364462` |
| Branch de homologação | `work/homologacao-followup-assistido-20261031` |
| Commit dos testes finais e SQL corretiva | `e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b` |
| CI final | [GitHub Actions 41230661649](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/41230661649), success |
| Serviços isolados | PostgreSQL 17.6, GoTrue v2.197.0, PostgREST v16.5 |
| Evidências versionadas | `docs/activation/ci-*.json`, `cloudflare-comparison.json`, `release-check.json` |
| Scripts reproduzíveis | `.github/workflows/crm-assisted-activation.yml` e `tests/activation/` |

Não houve reconstrução da loja nem mudança no frontend `f729cf5`: seus componentes, catálogo, checkout, impressão, pagamentos e assets continuam iguais. A única correção funcional desta etapa é uma migração CRM adicional, preparada e testada fora da produção. Não é necessário gerar outro ZIP de frontend por causa dela.

## Resultados da homologação

**50 verificações de integração aprovadas**, usando serviços reais em runner descartável, sem segredos nem clientes da produção. O login GoTrue gerou os JWTs de duas contas sintéticas; PostgREST validou esses tokens e executou as RPCs com as funções Auth lidas da produção. As tabelas comerciais externas são estruturas mínimas sintéticas; os corpos das funções CRM foram copiados do ambiente real, sem registros de clientes.

- 29/29 corpos de funções CRM coincidem com as migrações de origem; os hashes das definições reais foram novamente comparados em produção e coincidiram integralmente.
- Anônimo e usuário autenticado sem ACL foram bloqueados; `user_metadata` falso não concede acesso. JWT expirado/assinatura inválida foram recusados. Tabelas privadas não ficaram acessíveis ao navegador.
- Identificação do interessado, confirmação independente do produto, rejeição de evidência curta e cadastro de consentimento sintético passaram por RPCs reais.
- Entrada e resposta da loja geraram lembrete exatamente 2.700 segundos depois da resposta. Antes do prazo houve bloqueio; após avanço controlado **somente dos relógios sintéticos**, a elegibilidade foi aprovada. Não houve espera física de 45 minutos nem alteração de horários reais.
- Revisão devolveu telefone/produto corretos, sem marcar envio. Registro manual funcionou; repetição foi recusada. Duas requisições HTTP simultâneas produziram um sucesso e um bloqueio, sem duplicidade.
- Produto não confirmado, consentimento desconhecido, opt-out, horário de recebimento sem origem, resposta posterior e possível compra bloquearam contato/registro.
- Opt-out impediu novo consentimento pela mesma ação; nada foi reativado automaticamente.
- Evidências anteriores de consentimento e identificador da atendente foram preservados na correção adicional; a conta do navegador não conseguiu reescrever o histórico.
- Rollback conservou atendimentos e evidências, restaurou exatamente o corpo original de `crm_record_action` e suas permissões, e tornou as RPCs novas indisponíveis de forma segura.

Os 28 testes assistidos locais da entrega foram repetidos e passaram. Os 651 testes/build/TypeScript da versão de frontend já aprovados foram reaproveitados, pois o frontend não mudou. A abertura interceptada no Chromium desktop e documento 390 × 844 da entrega `f729cf5` continua válida para esses mesmos arquivos. Esta rodada acrescentou validação real de Auth/RPC/concorrência; não navegou até clientes reais no WhatsApp. Safari e escolha do aplicativo WhatsApp Business físico permanecem na homologação operacional futura.

A versão do PostgreSQL coincide com a produção (17.6). As versões hospedadas de GoTrue/PostgREST não foram identificadas de forma independente: a consulta pública ao OpenAPI foi recusada pelo gateway com exigência de chave secreta; não foi buscada uma chave privilegiada para contornar essa limitação. O resultado local comprova o contrato de JWT/claims/ACL/RPC, não uma réplica integral da infraestrutura hospedada.

## Correção indispensável descoberta nesta etapa

A migração `20261031175609_crm_assisted_followup_guard.sql` é compatível com as assinaturas e estruturas atuais, mas **não deve ser aplicada isoladamente**.

O teste reproduziu um deadlock real (`SQLSTATE 40P01`): o registro assistido travava cliente → conversa, enquanto uma ação manual do endpoint antigo travava conversa → cliente. Uma das transações era abortada pelo PostgreSQL. O cadastro anterior também mantinha apenas a evidência de consentimento atual e um evento genérico, sem autor identificado nem preservação de versões anteriores.

A correção preparada é `20261031183242_crm_assisted_activation_hardening.sql`:

1. Padroniza a ordem cliente → conversa para todas as ações públicas da atendente.
2. Retira o acesso direto ao core inclusive do papel do provedor; o caminho público mantém as verificações existentes.
3. Acrescenta `crm_consent_audit`, privada e com RLS, registrando autor, horário, estados/evidências anterior e posterior e opt-out. Não fabrica ou preenche consentimentos históricos.
4. Solicita atualização do schema cache do PostgREST após o commit.

Após a correção, a resposta concorrente foi gravada e o registro de envio bloqueado leu o estado atualizado. O histórico de consentimentos/opt-out e a reversão foram testados. As duas migrações só foram executadas no banco sintético do runner.

### Arquivos SQL que precisam ser avaliados juntos

| Ordem | Arquivo | SHA256 |
|---|---|---|
| 1 | `supabase/migrations/20261031175609_crm_assisted_followup_guard.sql` | `123d7a85f34e463be8cf158b41223a35de9c0b26e2e006215673f0c78245f52b` |
| 2 | `supabase/migrations/20261031183242_crm_assisted_activation_hardening.sql` | `9924cf2a133204d6ba232015ef8292e756e64efa2dcc584e816d7ec8072b0bc4` |

As migrations têm aplicação única. Não executar todo o diretório de migrations nem reaplicar migrações antigas com base apenas no nome ou timestamp do arquivo. A numeração registrada no Supabase difere de vários nomes de arquivo; a compatibilidade foi conferida por definições reais.

## Bloqueio externo: horário original das mensagens

Na leitura inicial desta execução havia **58 lembretes pendentes, zero consentimentos válidos registrados, 1.841 entradas e 1.999 saídas Tintim**, todas com `time_basis=webhook_received`. Não havia eventos Meta registrados. São contagens do momento da consulta, não valores permanentes.

O webhook Tintim publicado (v11) tem os mesmos três arquivos do código avaliado. Os diagnósticos correspondem à forma plana `message` como texto, `from_me` e `lead.phone`; os campos de horário que o parser reconhece não estão produzindo eventos com timestamp original. A configuração existente permite usar recebimento para organizar lembretes; ela **não** torna esses horários válidos para liberar o contato comercial.

A documentação oficial atualmente vinculada pelo Tintim mostra `message.create` com direção, mensagem e identificador, sem um timestamp original por mensagem. Os outros três eventos são relativos ao lead/origem/etapa. Suas datas de cadastro ou atualização não comprovam a hora da última mensagem. Na API documentada, `moment` é um campo de **entrada** para importar uma mensagem no Tintim; não foi encontrado endpoint documentado para buscar a mensagem original pelo seu ID. Isso não prova que o provedor não tenha outra capacidade: ela precisa ser documentada e comprovada para esta conta.

Fontes oficiais consultadas: [Webhooks do Tintim](https://tintim.app/documentacao/documentacao-de-webhooks/), [documento de payloads vinculado pelo Tintim](https://docs.google.com/document/d/1fnLIAzmYoyyaPr_H5Fis_g3QWQ0wWQiCQbPWP57YLzo/edit), [API vinculada pelo Tintim](https://docs.google.com/document/d/1rs-6rhstjAhjf_fAeRXUy7c2sl2yTQKhdt_7GUqfyhs/edit?usp=sharing). Os dois documentos foram lidos pelo export público, não a partir de cópias de terceiros.

### Ação concreta para o Tintim/provedor já conectado

Solicitar ao suporte/engenharia, **mantendo a conexão e o número atuais**:

- O timestamp original de cada mensagem recebida e enviada: campo/caminho JSON, unidade, fuso e semântica exata.
- Identificador estável da mensagem e vínculo com o mesmo contato/conta, direção e tratamento de retries/atrasos.
- Amostra sanitizada do payload efetivamente entregue nessa conta Coexistence, inclusive comportamento com mídia, sem tokens nem conteúdo privado.
- Se o `message.create` atual não expõe isso: endpoint de leitura ou encaminhamento de eventos do provedor já conectado, com documentação e permissão de uso nessa mesma instalação.

Se a solução for evento oficial Meta pelo parceiro existente, comprovar assinatura, conta/número e timestamp por mensagem antes de configurar qualquer callback. A Edge Function receptora Meta está publicada em v2, mas não há eventos armazenados e não foram encontradas invocações desse receptor na janela de logs consultada. Estar publicada não prova assinatura ativa ou configuração completa. Não substituir callbacks de outro aplicativo nem reconectar/migrar o número.

Se o provedor entregar um campo novo que o adapter não reconhece, será necessária uma adaptação pontual e nova homologação desse formato. Não mudar `time_basis` de registros antigos para `provider_timestamp`, não usar o horário do cadastro do lead, não estimar o horário original a partir do recebimento. A verificação empresarial Meta e o transporte automático não são exigência para a atendente abrir `wa.me`; esta etapa continua manual. O bloqueio atual é a evidência exigida pelo contrato de elegibilidade e o consentimento verdadeiro.

## Consentimento verdadeiro: procedimento da atendente

1. Durante um atendimento real, conferir se o cliente autorizou especificamente o acompanhamento comercial. Uma mensagem recebida ou origem de anúncio não basta.
2. Registrar a resposta efetivamente dada, data/horário da conversa e finalidade/escopo no campo de evidência. Exemplo de estrutura, **não consentimento a ser copiado para clientes**: resposta do cliente + instante da conversa + autorização de um lembrete daquele produto.
3. Conferir o telefone e salvar o produto confirmado separadamente. Não transformar anúncio/menção em preferência comprovada.
4. Registrar a autorização pela conta individual já habilitada na ACL; a correção adicional conserva a evidência e o autor. Não compartilhar login entre atendentes se for necessário distinguir a autoria.
5. Se houver pedido para parar, usar opt-out. Não tentar reverter por cadastro novo, outra conversa ou clique em Registrar autorização. O sistema bloqueia essa reativação.
6. Antes de abrir o WhatsApp, revisar a conversa diretamente no aplicativo para resposta, compra ou mudança de produto posteriores. A janela será revalidada pelo servidor; não é liberada pela declaração da atendente.

O banco guarda uma declaração auditável da atendente; ele não comprova sozinho que o cliente realmente disse aquilo. A fonte é a conversa real. Os cadastros de consentimento desta homologação existiram somente em fixtures descartáveis.

## Cloudflare e pacote existente

Foram comparados, byte a byte, `/`, `/admin`, `/pedido` e **14 arquivos JS/CSS referenciados**. Todos coincidem com o pacote anterior `luciane-oliveira-doces-pre-reserva-morango-31out2026.zip`; os três HTMLs diferem do ZIP `f729cf5`, e os bundles ativos não contêm as duas RPCs assistidas novas. Portanto o frontend novo **não está publicado** na amostra verificada.

O identificador do deployment e o SHA indicado no painel Cloudflare ainda precisam ser registrados pelo operador antes de publicar. A equivalência dos arquivos públicos observados com o pacote anterior não substitui esse identificador nem prova o conteúdo de arquivos não servidos publicamente.

O ZIP candidato de frontend continua:

`LUCIANE-COMERCIAL-FOLLOWUP-ASSISTIDO-f729cf5-20261031.zip`

SHA256: `e0b454e4ffa41b7229ad7535d2ce5ad29f0ef9b51af6000fe7dc5afab83ab1d3`.

Sua integridade e correspondência com o código `f729cf5` foram preservadas. Ele não contém SQL e não substitui as duas migrações. O asset de configuração pública coincide com o ativo. Não foi gerado nem publicado outro ZIP de loja nesta etapa.

## Checklist sequencial de ativação — NÃO executado em produção

### Portão A — resolver a fonte temporal

- [ ] Obter a confirmação técnica e a amostra sanitizada do provedor atual.
- [ ] Homologar entrada e saída com timestamps originais, inclusive retry/atraso e comportamento com mídias. Confirmar que uma resposta posterior cancela o lembrete.
- [ ] Fazer eventual ajuste pontual do adapter em branch isolada, se o formato comprovado exigir; sem reconexão do número.
- [ ] Manter bloqueados os contatos antigos sem evidência original. Não liberar os 58 registros em lote.

**Se este portão falhar, não prosseguir para a liberação comercial.** Cadastro de consentimento não corrige a ausência de timestamp.

### Portão B — preparar reversão e confirmar pré-condições

- [ ] Registrar o deployment de produção atual do Cloudflare (ID, URL e eventual commit), para rollback exato.
- [ ] Garantir backup recuperável e identificar sua restauração. Conservar snapshots das funções/permissões CRM. Os snapshots de schema desta homologação não são um backup completo dos dados comerciais.
- [ ] Obter autorização específica para aplicar **as duas** migrations ao projeto comercial e para publicar o ZIP candidato. A autorização de testes não cobre produção.
- [ ] Rodar `tests/activation/precheck-readonly.sql` com leitura autorizada. Esperado: 29 hashes iguais, guard/core/audit ainda ausentes, tabelas CRM com RLS e sem SELECT de anon/authenticated, 45 minutos e automatic_sends_enabled=false. Divergência exige comparação, nunca sobrescrita automática.
- [ ] Conferir os dois arquivos SQL pelos hashes acima. Não reutilizar migrações de Luciane Gestão nem scripts de contas/fixtures do runner.

### Portão C — banco, após autorização

- [ ] Pausar brevemente o uso do CRM pelas atendentes durante a troca; checkout/cozinha não precisam ser desligados por esta alteração.
- [ ] Aplicar a migration guard e imediatamente a hardening, nessa ordem, antes de retomar o CRM. Não deixar a versão intermediária sujeita ao deadlock em uso.
- [ ] Rodar `docs/activation/postcheck-readonly.sql`. Esperado: RPCs novas existentes; anon sem EXECUTE; authenticated autorizado ao endpoint público, mas sujeito à ACL interna; core inacessível diretamente a authenticated/service_role; auditoria privada com RLS; 45 minutos e transporte automático false.
- [ ] Confirmar atualização do cache PostgREST, sem conceder acesso direto às tabelas para resolver erros.

### Portão D — frontend, após autorização

- [ ] Confirmar novamente o SHA256 do ZIP `f729cf5` e publicar o pacote completo no projeto correto, sem main/merge.
- [ ] Registrar o novo deployment e conferir `/`, `/admin`, `/pedido`, assets e fotos. Não criar pedido, pagamento ou baixa de estoque artificial.
- [ ] Conferir a conta individual autorizada no admin e o acesso negado a conta sem ACL. A abertura normal do CRM executa sync/hold existentes e pode atualizar o CRM: não tratá-la como teste estritamente somente leitura contra produção.
- [ ] Homologar no Safari físico e notebook: buscar contato, distinguir anúncio/menção/produto salvo, preservar rascunho e contexto, timeout/erro, abertura da aba e WhatsApp Business correto. Não marcar envio apenas por abrir a conversa.

### Portão E — piloto comercial legítimo

- [ ] Escolher um atendimento real novo que tenha autorização verdadeira e eventos temporais verificados; sem fabricar consentimento para teste.
- [ ] Salvar produto, observar o prazo real de 45 minutos, conferir ausência de resposta/compra/opt-out e revisar a conversa.
- [ ] Abrir a conversa somente se a revalidação liberar o contato e conferir destinatário e mensagem no aplicativo.
- [ ] A atendente decide e faz o envio manual. Só depois registra Envio feito manualmente, uma vez.
- [ ] Confirmar saída da fila, registro em Finalizados e bloqueio de repetição até nova resposta. Cliente respondendo após a abertura exige nova conferência no aplicativo; o CRM não controla o que ocorre fora dele.

**Essa etapa é operação futura autorizada; nenhum contato ou mensagem real foi utilizado nesta execução.**

## Rollback operacional, testado em ambiente isolado

Disparadores: destinatário incorreto, duplicidade, falha de elegibilidade, erro de RPC repetido ou `40P01`. Parar o acompanhamento assistido, mantendo atendimento normal e loja funcionando.

1. Registrar o problema sem expor texto/telefone de clientes em logs. Suspender ações da aba CRM.
2. Voltar ao deployment de produção capturado no Portão B. No Cloudflare Pages, selecionar o deployment de produção anterior e a ação de rollback. Um preview não serve como alvo de rollback. [Procedimento oficial Cloudflare](https://developers.cloudflare.com/pages/configuration/rollbacks/).
3. Se houver necessidade de reverter o banco, executar **primeiro** `tests/activation/rollback-hardening.sql` e **depois** `tests/activation/rollback-guard.sql`, com autorização e snapshot conferidos.
4. Conservar a tabela privada `crm_consent_audit` e seus registros; não apagar consentimentos, envios, clientes ou conversas para reverter código.
5. Conferir o corpo e as permissões de `crm_record_action` contra o snapshot, ausência das RPCs novas, transporte false e preservação de dados. O frontend novo diante de RPC ausente bloqueia a operação, sem liberar mensagem.
6. Não reaplicar a migration hardening cegamente após rollback: a tabela de auditoria foi preservada. Uma reaplicação deve ser preparada para esse estado por migração incremental compatível.

No teste de reversão, o corpo original e os privilégios de authenticated/service_role foram restaurados, anon ficou sem EXECUTE e os registros operacionais/auditáveis permaneceram. A remoção das proteções novas restaura o comportamento antigo; por isso o frontend correspondente e a pausa do CRM fazem parte da reversão.

## Limites e estado final

Produção foi acessada apenas por leitura de schema, funções, migrations, configurações, contagens, logs agregados e arquivos públicos. Nenhuma migration aplicada, nenhuma publicação, nenhuma alteração de main, nenhum envio, nenhum consentimento real inventado e nenhum disparo automático habilitado. Os primeiros problemas de montagem do runner (schema/search_path Auth) foram corrigidos no ambiente sintético; não afetaram a produção. O teste final passou integralmente.

A homologação comprova Auth/RPC/SQL/ACL/concorrência nos cenários exercitados. Não comprova disponibilidade contínua de webhooks, entrega de mídia pelo provedor, hardware/iPhone real ou mudanças futuras no ambiente. O procedimento está preparado; a liberação comercial permanece fechada até os portões documentados serem satisfeitos.

## Links dos scripts avaliados (execução futura autorizada)

- [Guard original](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/blob/e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b/supabase/migrations/20261031175609_crm_assisted_followup_guard.sql)
- [Correção adicional obrigatória](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/blob/e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b/supabase/migrations/20261031183242_crm_assisted_activation_hardening.sql)
- [Pré-checagem somente leitura](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/blob/e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b/tests/activation/precheck-readonly.sql)
- [Rollback da correção](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/blob/e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b/tests/activation/rollback-hardening.sql)
- [Rollback da guard](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/blob/e1e9bd7a8938649d65923ff2eb790bb3dfe60c7b/tests/activation/rollback-guard.sql)

Os arquivos são procedimentos técnicos de banco, não pacotes para upload no Cloudflare.
