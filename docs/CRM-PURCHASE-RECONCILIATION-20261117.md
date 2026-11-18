# Conciliação de compra para recuperação — auditoria de 17/11/2026

Atualização candidata posterior sobre c216fb7: captura/leitura conectadas no código sob CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED=false por padrão; detalhes da integração e do corte abaixo. O diagnóstico inicial e seus resultados permanecem históricos. Nenhum deploy ou flag produtiva alterados neste incremento.

Base: 37db24bcfc41d43926f037e527b9a88f85ed795a, PR #67 em rascunho. Escopo: leitura do Supabase comercial e implementação candidata isolada. Sem SQL produtivo, deploy, alteração do checkout, associação artificial de clientes ou pagamentos, ampliação de contatos ou envio.

## Diagnóstico comprovado

- O checkout WhatsApp aceita telefone opcional; os pedidos criados nos sete dias consultados estavam sem customer_phone. Não é falha de normalização nem prova de erro do pagamento. sales_channel=whatsapp identifica a finalização, não prova que o cliente não navegou pelo site.
- Há vínculos Tintim por código do pedido, com status candidate; também há pedidos sem vínculo. A RPC ativa serializa por pedido, impede vínculo concorrente com outra conversa e preserva candidate. Sua janela e observed_at não certificam horário original da mensagem. Não promover esses vínculos automaticamente a identidade comprovada.
- Os pedidos manuais pagos consultados possuem paid_at e histórico de transição para paid com source=admin e usuário identificado. A RPC ativa exige equipe autenticada e permite Pix manual, dinheiro e cartão na entrega; é idempotente e bloqueia cancelados. Ausência de tentativa Mercado Pago nesses meios não é falha de confirmação.
- No episódio de teste não houve correspondência exata de pedido pelo telefone. Isso não comprova ausência de compra: o telefone está ausente nos pedidos e há vendas fora do banco.
- O proprietário confirmou nesta conversa que vendas concluídas diretamente no WhatsApp, sem pedido no site, ficam somente na conversa. Portanto, não há fundamento para ligar purchase_coverage_verified ou remover order_check_incomplete com base apenas no banco de pedidos.
- A permissão do contato piloto está unknown, sem evidência, data ou auditoria correspondente. Não equivale a opt-out, mas também não permite conceder autorização artificial.
- Envios automáticos false e zero tentativas na auditoria. Sem leitura de nomes, corpos de conversas, endereços, credenciais ou identificadores pessoais na saída das consultas; agregados comerciais não publicados neste repositório.

## O que já protege a operação

O snapshot suprime pedido pago quando há correspondência exata de telefone. Vínculo candidato, pedido pendente ou declaração do cliente geram impedimento de conciliação, sem inventar pagamento. Pedidos sem identidade na janela geram unattributed_orders_in_window. A cobertura externa permanece false no handler. Não remover esses controles para transformar blocked em candidato.

O texto do app_echo não é atualmente transformado em sinal privado de venda: o normalizador comercial existente preserva direção e horário, mas só extrai texto direto de inbound. A persistência semântica e o avaliador também tratam declarações de compra do cliente, não confirmações da loja. Essa é a lacuna específica para fechamento direto no WhatsApp.

## Candidato isolado entregue

recovery-purchase-signal.mjs reutiliza o verificador HMAC/envelope/ativos existente antes de inspecionar texto direto, dentro de um único atendimento configurado no servidor. Preserva timestamp original e recusa evento futuro ou fora de 24 horas. Extração própria vincula corpo a direção, telefone, ID e horário; IDs repetidos são ambíguos. Encaminhamentos, respostas citadas e mídia não viram evidência.

Gramática inicial deliberadamente restrita: frases inteiras como “Recebi seu Pix”, “Seu pagamento foi confirmado” ou “Seu pedido foi entregue” são indícios de compra. Perguntas, negativas, terceiros, condicionais, promessa futura e simples “pedido confirmado” ficam desconhecidos. Não há suporte universal à linguagem natural; falsos negativos são esperados e ausência de sinal nunca certifica ausência de compra.

Saída fechada: detected/basis, blocker=purchase_or_order_requires_reconciliation, payment_confirmed=false e send_authorized=false. Nenhum corpo de mensagem ou telefone é retornado. Sinal de retirada/entrega não se converte em pagamento. Não gera pedido, receita, Purchase, consentimento ou vínculo financeiro. O classificador puro é interno; só o inspetor de envelope assinado valida a origem.

**Limite de instalação:** módulo não importado por webhook, snapshot, motor de decisão ou agendador. Não lê dados reais, não persiste e não muda a decisão produtiva. Workflow acrescenta testes do candidato. Validado com 56 testes focados (oito novos), cobrindo assinatura, identidade, horário, conflito de IDs, redação, cliente/loja, preservação de decisões existentes e ausência de autorização de envio. Build/frontend, suíte global e novos testes reais não foram executados por este incremento sem conexão ao runtime.

## Primeiro caminho executável para integrar

1. Preparar captura de sinal privado após core autenticado, exclusivamente na allowlist original. Associar a message_id e occurred_at originais; persistir somente semântica fechada. Conferir reutilização do contrato privado existente antes de propor tabela ou migração. Não substituir o interesse de produto pela confirmação da loja.
2. Restaurar o sinal somente quando corresponder ao evento oficial e à direção, tanto no echo quanto na reavaliação periódica. Acrescentar bloqueio de conciliação; nunca liberar envio por ausência de frase reconhecida. Cobrir em teste integração assinada → persistência privada → reavaliação sem mensagem nova.
3. Continuar a conciliação dos pedidos sem telefone com evidências de referência direta de pedido na integração oficial. Código de pedido público/encaminhado ou rótulo Tintim candidate não comprovam propriedade. Nenhuma exigência de novo campo no checkout foi aprovada neste corte.
4. Manter cobertura externa como não certificada enquanto existirem fechamentos sem captura confiável. Considerar revisão humana apenas nas exceções, sem exigir que Luciane registre manualmente todas as conversas para operar o motor.
5. Apresentar impacto e reversão do novo corte de captura/leitura antes de implantá-lo: backup da Edge homologada, início OFF, único telefone, zero envios e retorno à fonte anterior/flag OFF em caso de falha. A autorização anterior do relógio não é autorização irrestrita para nova captura produtiva.

Permissão aplicável e loja aberta são gates separados. Esta auditoria não altera regras da Meta ou de proteção de dados. Nenhuma oportunidade elegível, venda recuperada ou receita incremental foi comprovada por este candidato.

## Integração candidata autorizada — sem ativação produtiva

O proprietário esclareceu que o painel e o Tintim recebem confirmações incompletas, muitas vezes no outro dia; etapa Comprou pode ser registrada manualmente sem mensagem, e os gatilhos nem sempre contabilizam recompras conforme relato ainda não auditado na plataforma. Cerca de 80% dos pedidos passam pelo site segundo estimativa operacional, com baixo abandono relatado nesse grupo. Não usar ausência de confirmação imediata como abandono. Gatilhos novos para Meta e leitura automática de comprovantes ficaram fora da prioridade atual.

O candidato reconhece agora o modelo completo já usado pela loja: cabeçalho Pedido confirmado, linha Valor dos produtos com moeda válida positiva, declaração de que corresponde somente aos produtos e agradecimento; aceita a linha conhecida de prazo de entrega opcional. Pedido confirmado isolado, escolha de Pix/cartão/dinheiro, imagem e comanda impressa não provam pagamento. O valor só valida a estrutura, sem persistência, soma financeira ou novo evento Meta.

Com a flag privada CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED=true, somente após o ingresso core, o snapshot inspeciona envelope HMAC no escopo original e grava confirmação em observations por message_id/horário original. Reutiliza possible_purchase/purchase_statement_not_payment, sem SQL novo. Na reavaliação, restaura somente se houver evento oficial com mesmo ID, horário, identidade e direção outbound. O interesse inbound permanece separado. A confirmação adiciona purchase_or_order_requires_reconciliation, nunca paid_order. Uma nova manifestação explícita de interesse delimita o uso de sinais antigos de conversa; isso não resolve retroativamente pedidos ou etapas Tintim sem data confiável de venda.

O mesmo corte reconhece apenas o modelo completo conhecido de saudação de indisponibilidade fornecido pelo proprietário. Persiste unknown/no_evidence em evento outbound como ausência de resposta comercial efetiva; o marcador tem significado só nessa direção e só é gravado pelo adaptador interno de macro verificada. O motor exclui esse evento do cálculo da resposta efetiva e retorna pending_service/store_response_pending. Não altera a fila core ou o horário do lembrete existente. Saudações desconhecidas, mensagens manuais livres e outras automações não têm detecção universal comprovada.

journey_state no snapshot diferencia purchase_confirmed, purchase_reconciliation, pending_service, conversation_opportunity e insufficient_evidence. É diagnóstico privado, sem nova UI ou coluna; blocked/suppressed e os motivos continuam o contrato persistido da fila. Estado cancelled canônico do banco passa a suprimir recuperação de pedido identificado, preservando compatibilidade com canceled legado. Aceite/completed/printed não viram pagamento.

Validação: 83 testes direcionados locais aprovados, incluindo HMAC, escopo, replay, normalização de horários equivalentes, captura/restauração na reavaliação sem mensagem nova, interesse preservado, episódio novo, macro de loja fechada e flag OFF sem nova captura/leitura de sinais outbound. PostgreSQL isolado (PGlite 0.5.14 do lockfile) validou os novos marcadores com a RPC existente, dedupe, retenção/expurgo, RLS e ACL. Teste de persistência foi repetido após acrescentar explicitamente o marcador de loja fechada. Onze testes de continuidade/governança e igualdade do bundle do agendador passaram. Não houve build do site, regressão comercial global, Deno typecheck ou workerd novo; Worker/checkout/contratos HTTP não mudaram.

### Impacto e reversão do próximo corte

Fontes afetadas: observer compartilhado via snapshot/persistência/classificador, entrypoint webhook e handler da Edge de reavaliação; novo módulo compartilhado transitivo. Sem alteração de schema, RPC, grants, URLs, JWT/HMAC, catálogo, pagamentos, impressão, Tintim ou agendamentos. O recurso tem flag privada nova OFF por padrão nos dois caminhos; manter cobertura externa false, sombra ativa, lista original e envios OFF.

Antes de implantar: recuperar os dois bundles ativos e metadados para reversão, comparar todos os arquivos transitivos com a produção e conferir ausência/false da flag nova sem expor secrets. Implantar versões compatíveis dos dois caminhos com a flag OFF. Só então ativar a flag no único telefone dentro da autorização atual e homologar uma confirmação/sinal sintético autorizado; não importar os prints históricos nem outros contatos. Conferir semântica privada e decisão após prazo, sem gerar pedido, receita ou mensagem. O conector usado nesta preparação não configurou Edge Secrets.

Reversão: desligar somente CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED nos dois caminhos; se houver regressão de transporte, restaurar o backup integral do webhook mantendo suas configurações. Se houver falha de continuidade/segurança, pausar também SHADOW/DUE conforme runbook existente. Preservar registros e expurgo, sem DROP. Desligar a flag não apaga evidências nem modifica pagamentos. Implantação e prova real deste incremento permanecem pendentes; autorização não equivale a instalação.

## Instalação produtiva restrita — 17/11/2026, 19h30 America/Belem

Autorização de continuidade recebida do proprietário. Login no painel concluído pelo próprio usuário após hCaptcha; nenhuma credencial foi lida ou transferida para código. Nome de projeto comercial conferido no painel. CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED estava ausente, foi criado false às 19h26:34 e teve digest de false conferido antes dos deploys. SHADOW, RETENTION e DUE permaneciam true. Lista autorizada foi conferida por igualdade interna de digest com o telefone piloto já homologado, sem revelar telefone nem ampliar escopo.

Fontes do SHA bf58be86fa8e5947373bf1e51cb9c61291ae25d5 recuperados diretamente do GitHub e fechamento transitivo completo conferido. Quatro workflows remotos desse SHA concluíram success, inclusive regressão comercial. Backups integrais anteriores, sem valores de secrets, em docs/edge-release/rollback/20261117-recovery-purchase/ (webhook 15 arquivos; reavaliação 18). Metadados anteriores eram webhook v21/hash homologado e reavaliação v9/hash anterior após criação da flag; alteração de secrets incrementa versão sem mudar código.

| Função | Deploy inicialmente OFF | Metadado após ativação | Bundle SHA-256 | Autenticação |
|---|---|---|---|---|
| crm-recovery-reevaluate | v10, 19 arquivos | v11 ACTIVE | 3921d5d4b1ef70e3c22415e7bfd5e6203d6f534b506d549575b474f29d3cdc84 | verify_jwt=true e HMAC preservados |
| crm-whatsapp-webhook | v22, 18 arquivos | v23 ACTIVE | 3bad4efd1fe20072cdf567058062c7202d1ad4fd667bf9eccf285f97ee9bf694 | verify_jwt=false anterior; verificação Meta no corpo preservada |

Arquivos recuperados de ambos os deploys idênticos ao conjunto transitivo do commit. Core de eventos/status, catálogo e fotografias não foram modificados. O fechamento do webhook passa a incluir permission/availability já usados na reavaliação e allowlist de RPCs restrita correspondente; allowDueRpc continua false no webhook. Diferenças herdadas de diagnóstico fechado no ingress e redirect/manual no assinador compartilhado foram revistas; nenhuma redução do verificador de assinatura.

Smokes sem credenciais ou dados comerciais: PUT webhook=405; POST reavaliação=401. Nenhum envio ou webhook Meta sintético foi provocado. Após fontes compatíveis instaladas, flag nova true às 19h29:26 no painel, com digest conferido. A configuração vale para os dois caminhos, dentro do telefone original.

Tick real 19h30:13, ledger 1794954600, log recovery_due=shadow/evaluated, send_authorized=false, claimed=0, recorded=0, stale=0, failed=0. Próximo lembrete piloto estava pending para 19h57:18; zero seleção às 19h30 é coerente, não prova ainda leitura de sinal novo. Consultas posteriores: envios false, zero tentativas, um atendimento privado e zero semânticas outbound novas desde a ativação. Não confundir instalação e execução autenticada com homologação real do reconhecedor.

Pendente imediato: transporte inbound/app_echo pós-atualização e captura de um sinal autorizado. Não pedir confirmação fictícia no padrão Pedido confirmado para teste, pois o Tintim pode gerar venda/Meta indevidos. Uma mensagem neutra do telefone piloto permite conferir ingresso/saudação conhecida sem simular compra; a confirmação de venda deve ser observada em ocorrência legítima ou validada isoladamente sem efeitos externos. Não repetir o teste de produto/timer como se fossem falhas pendentes.

Nenhum SQL, regra financeira, pedido, pagamento, estoque, QZ, Meta/Tintim, Cron Worker, merge ou Pages foi alterado. Reversão primária: flag nova false. Se o ingresso core regredir, restaurar o backup integral do webhook; preservar verify_jwt e configurações existentes. Se houver falha de segurança/continuidade, pausar também SHADOW/DUE conforme procedimento anterior. Backups não contêm credenciais; não adicionar digests de contatos ao repositório.

### 17/11/2026 — Ingresso e saudação conhecida comprovados após instalação

Mensagem neutra autorizada do piloto recebida às 19h35:53 America/Belem, classificada unknown/unconfirmed/commercial_intent_missing, sem fabricar compra. Depois houve dois app_echo às 19h36:36/19h36:44 e saudação de indisponibilidade às 19h41:29; todos com horários originais. A saudação foi gravada na estrutura privada como outbound unknown/no_evidence, conforme contrato do marcador, comprovando reconhecimento e persistência no webhook instalado. Captura não contém texto, valor ou imagem.

Log das 19h41:33: processed=1, state=observed, blocked e send_authorized=false. Bloqueios: order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved, not_due e unattributed_orders_in_window. Há resposta manual anterior à saudação no print, portanto este teste não demonstra pending_service num episódio com somente saudação; não inventar essa homologação. O cenário isolado continua coberto por teste local, inclusive restauração posterior. Não é necessário pedir repetição agora.

Fila core manteve lembrete pending para 20h26:29, sent_at NULL, reagendado pelo echo; distinguir esse lembrete legado do cálculo de resposta efetiva do motor. Consultas às 19h42:25 confirmaram um atendimento privado, envios false e zero tentativas. O gatilho de fechamento/compra e a restauração desta nova saudação por tick produtivo ainda não foram homologados neste teste. Não gerar confirmação fictícia que possa registrar venda no Tintim/Meta. Nenhuma configuração ou fonte produtiva foi alterada nesta verificação.

### 17/11/2026 — Confirmações manuais do Tintim: proteção existente e limite de recompra

Auditoria somente leitura confirmou ativos os triggers tintim_commercial_observation_on_receipt, crm_tintim_live_sync e crm_purchase_signal_before_followup. A ponte já cancela lembretes pendentes quando o Tintim informa Comprou/convertido/vendido/venda realizada pelo telefone, inclusive atualização manual sem mensagem de gatilho. Há ocorrências reais de suspensão por tintim_purchase_signal. Isso não altera orders, pagamento, receita ou Meta. Não foi necessário criar outra ponte nem ampliar coleta de contatos.

O armazenamento existente observa sale_amount e sale_amount_from_message separadamente, com review_status=unverified. Quando ambos aparecem, classifica ambiguous_both_fields e não escolhe precedência ou soma vendas. O contrato persistido não fornece identificador de venda e data efetiva de pagamento por recompra; updated/observed/recorded são tempos do evento/registro, não prova da hora da venda. Diferença numérica entre observed_at e received_at não certifica origem do horário.

A trava legada de criação/adiamento de lembrete usa o rótulo Comprou sem limitar a uma venda ou episódio. Existem contatos com nova atividade após a atualização dessa etapa; são candidatos a revisão do vínculo temporal, não oportunidades recuperáveis comprovadas. Remover a trava por idade de updated_at/last_observed_at seria liberar um cliente potencialmente comprador sem base suficiente. Nenhum guard ou status produtivo foi removido/modificado nesta auditoria.

Novo teste em PostgreSQL/PGlite executa funções/triggers reais das migrations: evento manual lead_update sem texto de gatilho → observação manual_or_default/unverified → suspensão de lembrete pelo telefone, com pagamento mantido pending; reproduz também o bloqueio legado de um novo lembrete enquanto Comprou persiste e a ambiguidade dos dois campos de valor. Quatorze testes direcionados do Tintim aprovados. Dados estritamente sintéticos, nenhuma chamada Meta/WhatsApp/Tintim e nenhuma mutação produtiva. Incluído na CI isolada de recuperação.

Restauração da saudação no tick produtivo continua dependente do vencimento real do lembrete; não antecipar due_at ou criar oportunidade para testar. Permanecem: sombra/telefone original/envios false/zero tentativas. Próxima evolução de conciliação deve obter evidência vinculada ao episódio/pedido e mapear confirmações manuais, sem usar rótulo histórico como compra atual nem usar ausência de gatilho como abandono.

### 17/11/2026 — Tick após a saudação comprovado às 20h30

Consulta às 20h32:33 America/Belem confirmou tick 1794958200 recebido às 20h30:13 e avaliação gravada às 20h30:17 para o lembrete com due_at original 20h26:29. Log recovery_due: claimed=1, recorded=1, stale=0, failed=0, state=evaluated, mode=shadow, send_authorized=false. Tick anterior das 20h25 não selecionou atendimento, corretamente antes do prazo. Lease liberado, sent_at NULL, envios false, zero tentativas e escopo privado de um atendimento.

Decisão blocked com order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved e unattributed_orders_in_window. not_due não aparece mais. Mensagem neutra de teste não confirmou interesse em produto; bloqueio de produto não é regressão do reconhecimento homologado de Prestígio no episódio anterior. Não fabricar interesse, pedido ou consentimento para tornar o resultado elegível.

O marcador semântico outbound unknown/no_evidence da saudação às 19h41:29 segue disponível e vinculado ao evento oficial correspondente. A versão instalada executa leitura/restauração privada no timer. O resumo fechado não expõe uma trilha por marcador, e havia resposta manual anterior: não declarar que este teste provou pending_service num episódio somente com saudação automática. Captura/persistência real, execução periódica pós-prazo e gravação estão comprovadas; os cenários de restauração isolada e ausência de resposta efetiva continuam cobertos pelos testes locais. Sem nova mensagem na janela observada desde a saudação.

A validade operacional dessa decisão terminou às 20h32:17; na consulta ela já era evidência histórica, não decisão fresca nem autorização de envio. Nenhum relógio/dado foi modificado para o teste. Não pedir repetição do timer/produto. Próxima prioridade continua separar sinal histórico de Comprou e compra no episódio atual, preservando proteção diante de registros manuais tardios e cobertura externa não certificada. Nenhum deploy ou flag alterados nesta verificação.


## Nova oportunidade de cliente recorrente — candidato isolado de 17/11/2026

Base remota a178c54b77bc007ea681f1078df22fa3b51a0072 confirmada antes do incremento. Proprietário autorizou desenvolver a distinção entre compra anterior e interesse atual. Compra passada não deve significar supressão vitalícia, mas ausência de gatilho e silêncio de 45 minutos não comprovam abandono. Prazo existente preservado como hipótese a medir, sem promessa de conversão.

Novo módulo interno recovery-purchase-episode.mjs recebe apenas fatos previamente verificados pelo servidor. Exige interesse explícito com horário original oficial, identidade verificada e leitura dentro de 24h. Evidência de compra já recebida antes desse interesse é historical_only; informação recebida no mesmo instante ou depois permanece current_or_ambiguous, inclusive atualização manual tardia alegando data antiga. Horário de recebimento é usado exclusivamente para ordenar conhecimento anterior, nunca como horário da venda ou início da janela/prazo. Exige receipt_time_basis=server_received_at, não aceita last_observed_at como substituto. Conflitos, identidades diferentes, horário inválido/futuro, origem desconhecida e interesse expirado ficam unresolved. Saída sem telefone, texto ou valor, sempre send_authorized=false, payment_confirmed=false e purchase_coverage_verified=false. Histórico anterior não certifica ausência de outra compra atual.

Este módulo é diagnóstico ISOLADO: não é importado pelas Edges, snapshot ou SQL; não cancela/reabre fila e não remove guardas. O bloqueio legado por etapa Comprou continua ativo em produção. Próximo corte precisa resolver em conjunto crm_protect_purchase_signal_followup, crm_ingest_tintim_on_change, crm_hold_tintim_purchase_signals e demais preflights/observadores que consultam etapa. Não basta afrouxar somente um consumidor. Antes da integração, selecionar recibos imutáveis com identidade comprovada e conferir consistência durante leitura; last_observed_at do lead não é data confiável da venda nem prova suficiente da ordem de conhecimento. Preservar confirmações tardias como conciliação pendente. Sem nova base de permissão ou pagamento inferida.

Validação deste incremento: sete casos novos e 52 regressões de classificador/motor/snapshot passaram (59/59); git diff --check passou. A tentativa adicional de executar o teste PostgreSQL existente não iniciou por ausência local de @electric-sql/pglite; não é falha demonstrada do SQL, tampouco aprovação local desse teste neste incremento. Workflow acrescenta o novo teste e mantém npm ci para PostgreSQL. CI remota deste novo commit ainda não conferida. Sem build frontend: nenhum código visual ou de checkout mudou. Nenhum deploy, SQL produtivo, secret, cron, mensagem, evento Meta, consentimento, contato, merge ou Pages alterado.


## Episódios conectados ao candidato — 17/11/2026, base 52ac41b

Implementação preparada, NÃO instalada. Migração 20261117234453_crm_recovery_purchase_episodes.sql gerada pelo Supabase CLI 2.58.5 (comando migration new); CLI e PGlite instalados somente em dependências temporárias, sem alteração de package/lock. Os corpos das sete funções produtivas afetadas foram comparados com as migrações-base e coincidem integralmente após normalização de quebras/trim. Leitura produtiva confirmou automatic_sends_enabled=false, zero crm_delivery_attempts e ausência de episode_scope.

A configuração privada episode_scope tem uma única linha possível (singleton), conversa referenciada, RLS, zero grants de tabela para navegador/service_role e prazo máximo de 24 horas. Começa vazia. Não há endpoint para ativá-la. A autorização continua sendo o telefone original já configurado; a existência de uma semântica não autoriza ampliar essa lista.

Predicado compartilhado tintim_episode_requires_review exige simultaneamente: escopo ativo; novo interesse explícito privado shadow-1 ainda dentro de 24h; evento oficial inbound com mesmo message_id, occurred_at e telefone; received_at válido; identidade Tintim por lead estável; etapa conhecida antes desse interesse pelo updated_at de servidor; e recibo anterior que concorde em conta, lead, telefone e etapa. last_observed_at não vira data da venda. Compra antiga pode deixar de bloquear exclusivamente essa nova oportunidade; ausência de gatilho nunca certifica cobertura. Identidade provisória, recibo ausente, dado futuro, informação recebida depois, confirmação privada atual ou expiração mantêm revisão. VOLATILE é intencional para que o predicado veja alterações do comando no AFTER UPDATE; não executa escrita.

Seis consumidores usam o mesmo predicado: criação/adiamento de follow-up; suspensão no painel; live sync Tintim; observação de mensagens Tintim; preflight; observador de automação. O snapshot chama RPC exclusivamente service_role, com DTO fechado sem telefone/texto/valor, apenas quando CRM_RECOVERY_EPISODES_ENABLED=true no servidor. Flag OFF não consulta a RPC nem muda o filtro anterior. Flag ON inclui etapas antigas na leitura, remove somente o indício histórico validado e mantém todos os demais impedimentos. RPC ausente/inválida ou mudança durante leitura fecha a avaliação. Cobertura externa continua false; paid_order, resposta, opt-out, permissão, disponibilidade e horário continuam separados. A UI atual segue conservadora com a etapa Comprou; nenhuma publicação visual é necessária para este candidato.

source_revision passa a incluir o estado efetivamente ativo do escopo e os recibos relevantes (ID, recebimento e digest do resumo, sem copiar valores para outra tabela). Um recibo novo invalida uma lease mesmo antes de atualizar a linha do lead. Não reabrir follow-ups cancelados: apenas uma nova resposta oficial que satisfaça o core pode criar novo acompanhamento. Nenhuma tabela financeira, pagamento ou evento Meta é alterado.

Validação final local: 93/93 testes direcionados passaram, incluindo PostgreSQL/PGlite com a migração real e o ingresso oficial crm_record_meta_message → criação de NOVO follow-up após interesse atual. Também cobertos: proteção fora do escopo; ausência de interesse semântico; identidade provisória; telefone divergente; hold/preflight/observer; confirmação tardia com data antiga; recibo durante lease; trigger AFTER UPDATE; ACL/RLS; expiração e desligamento. git diff --check e igualdade do dashboard Worker passaram. Em uma execução mais ampla, 94 testes passaram e o teste workerd não iniciou por Miniflare ausente no ambiente local; não houve falha demonstrada do Worker nem aprovação local nova dele. Workflow conserva npm ci e inclui o novo teste PostgreSQL. Sem build visual/checkout ou typecheck Deno local novos. CI remota do novo SHA precisa ser conferida.

### Instalação futura: impacto, sequência e reversão

Este é um novo corte de SQL + duas Edges, separado do relógio Cloudflare já homologado. Antes de executar: conferir CI do SHA exato; exportar DDL/ACL das sete funções e bundles integrais atuais das duas Edges; confirmar flags, único telefone, fontes e ausência de tentativas. Aplicar migração transacional com episode_scope VAZIA e flag nova ausente/false: comportamento legado deve permanecer. Repetir leitura de grants/RLS e testes de autenticação somente se o corte alterar essas superfícies — este código preserva HMAC/JWT. Instalar ambos os bundles com flag OFF. Só então preparar o escopo da conversa piloto já autorizada, com prazo finito, conferir a evidência existente sem modificar horários/dados comerciais e ativar a flag no servidor. Não fabricar outra compra nem disparar macro de confirmação para homologar.

A ativação do escopo altera também guardas SQL; desligar SOMENTE a flag da Edge não é reversão completa. Reversão primária: desabilitar episode_scope e desligar CRM_RECOVERY_EPISODES_ENABLED, preservando filas/evidências e envios OFF. Isso restaura o bloqueio legado para etapas Comprou, invalida decisões antigas pela revisão e não reabre registros. Se houver regressão estrutural, restaurar definições/ACL previamente exportadas e bundles capturados para este corte, sem DROP de dados. Não usar automaticamente backups anteriores a outros incrementos.

Pendência operacional: instalar/homologar esse corte restrito. Nenhum SQL produtivo, novo secret, Edge deploy, escopo, mensagem, consentimento, evento financeiro, merge ou Pages foi executado por este incremento.


### CI remota confirmada — código 09c0a44ab526596ce5e34b468f7994f049101a01

Quatro workflows de pull request concluíram success: governança (44203778474), continuidade (44203778562), CRM/tipagem/build/regressão (44203778631) e recuperação em sombra (44203778414). A execução push adicional (44203769975) também passou. Logs confirmam 111/111 testes de recuperação, incluindo PostgreSQL e workerd; 1.023/1.023 regressões comerciais; tipagem específica e build aprovados. Esses resultados pertencem ao código 09c0a44; este registro posterior é somente documental. Limitação local de Miniflare foi suprida pela execução remota com dependências do lockfile.

PR #67 continua aberto em rascunho, sem merge. Migração/escopo/flag/novos bundles não foram instalados em produção. Próximo passo continua o corte controlado descrito acima, e não outro teste de reconhecimento de produto ou do relógio.


## Corte instalado em sombra — 17/11/2026 à noite, America/Belem

Retomada do HEAD eb6b95e2970507772d15f6185b0340e15eb8eaeb; CI do HEAD aprovada. Código funcional aprovado 09c0a44ab526596ce5e34b468f7994f049101a01; atualização posterior 72dcef37c470456ecfedc75662862da5b0e0f18c contém correção/teste de restauração, sem mudar runtime. Quatro workflows de PR e verificação push desse incremento também passaram. Usuário autorizou continuar o desenvolvimento e observar a operação em sombra, mantendo todos os limites de envio/contatos/publicação.

### Preservação e validação

Backup em docs/edge-release/rollback/20261117-recovery-episodes/: bundles completos do webhook v23 (18 arquivos) e reavaliação v11 (19); definições, donos, ACL e estrutura SQL capturados às 21h03:42; restore-functions.sql. Backups persistidos no commit 3611188 antes da instalação. Conteúdo produtivo das sete funções-base igual ao código validado. Nenhuma credencial, valor de secret, telefone ou digest de contato foi salvo no repositório.

O teste adicional do arquivo de restauração detectou falta de ponto e vírgula após o delimitador devolvido por pg_get_functiondef. A migração já estava instalada com escopo VAZIO e flag OFF; a progressão para Edges/ativação foi pausada. Delimitadores corrigidos e restauração completa das definições/grants validada em PostgreSQL isolado antes de prosseguir. Esse teste foi incorporado permanentemente à suíte no commit 72dcef3. Não foi executada restauração produtiva nem apagado dado.

Migração aplicada pelo conector com nome crm_recovery_purchase_episodes, versão produtiva 20261118000629. A origem versionada é 20261117234453_crm_recovery_purchase_episodes.sql, gerada pelo CLI; diferença de versão é a data de aplicação pelo conector, não outro SQL. Os nove corpos SQL instalados conferem com essa fonte. Scope vazio/flag OFF inicialmente mantiveram a proteção anterior.

RLS ativa; anon e authenticated sem execução da nova RPC; somente service_role pode executar o DTO. Nenhuma escrita de scope concedida a anon/authenticated/service_role; helper privado não executável por eles. Papéis existentes e autenticação não foram afrouxados. Categorias/níveis dos advisories de segurança iguais ao baseline (alertas preexistentes mantidos). Sem alteração de pedidos, pagamentos, estoque, catálogo, QZ, Meta/Tintim, consentimentos, Worker/Cron ou Pages.

### Instalação das Edges e ativação

CRM_RECOVERY_EPISODES_ENABLED criada false às 21h05:22, pelo painel já autenticado. Fontes transitivas completas recuperadas do GitHub e comparadas com a produção; só mudaram snapshot, adaptador REST e linhas de configuração nos entrypoints/handler. Deploy primeiro com a flag OFF:

| Função | Versão do deploy | Após ativar a flag | Bundle SHA-256 | Controle |
|---|---|---|---|---|
| crm-whatsapp-webhook | v25 | v26 ACTIVE | f160343c6402e12f61db651b547d0968c3ac9431d242dd6096e695084d7f5cdc | verify_jwt=false anterior; verificação Meta preservada |
| crm-recovery-reevaluate | v13 | v14 ACTIVE | 66025a99d0265dd51693e62e5209a2c9951120676e4b30f0ecb1ac73630beb83 | verify_jwt=true e HMAC |

Todos os arquivos recuperados após deploy idênticos ao candidato (18/19). Alteração de secrets incrementa metadados de versão, sem alterar esses bundles.

Flag nova true às 21h10:15, ainda sem escopo SQL ativo; posteriormente escopo ativado às 21h11:29 exclusivamente para a conversa cujo telefone corresponde à lista original (conferência interna, sem publicar digest). Ativação guardada por contagem exata de uma conversa, escopo vazio, envios false e nenhuma tentativa. Prazo configurado de DUAS HORAS: expira às 23h11:29 de 17/11, sem alterar relógios ou dados comerciais. Após esse prazo, o predicado volta à proteção anterior; a flag pode continuar true e a avaliação em sombra continua, sem ampliar contatos. SHADOW/RETENTION/DUE/PURCHASE_SIGNALS preservadas; nenhum segredo Meta/gateway foi lido ou modificado.

### Evidência e limites reais

O telefone piloto não tem etapa Comprou nem lead Tintim correspondente na leitura por telefone. Isso impede declarar homologação produtiva do caso compra antiga → nova oportunidade: o comportamento está validado em PostgreSQL isolado, não foi fabricada uma venda nem alterada etapa para demonstrá-lo. Ausência de etapa não certifica ausência de compra.

Menção resolvida ao Prestígio às 17h37 permanece dentro de 24h, mas existem intenções mais novas às 19h06 classificadas como product_not_identified; o episódio recente permanece sem produto confirmado. Não reutilizar silenciosamente o produto anterior para liberar esse episódio. Últimos eventos oficiais continuam inbound 19h35:53 e app_echo 19h41:29, sem nova mensagem durante o corte. Não declarar nova homologação de inbound/app_echo pós-deploy sem evento novo.

O cron das 21h15 entrou às 21h15:14, antes do next_check_at original (21h15:16). Nenhuma seleção nesse disparo é coerente; relógio e fila não foram modificados para obter aprovação. O agendador permanece único, de cinco minutos. Reavaliações podem cair no disparo seguinte por causa desses segundos; não prometer que todo tick seleciona a conversa.

Consulta reproduzível somente leitura em supabase/verification/crm-recovery-pilot-status.sql: usa apenas o único escopo privado, retorna decisão/impedimentos, horários originais, validade e igualdade de source_revision, sem IDs de clientes, telefone, texto, dados de pagamento ou mutações. Decisão antiga/fora do prazo é evidência histórica, não autorização atual.


### Primeira reavaliação após ativação do escopo — 21h20

Chamada autenticada registrada no ledger às 21h20:13.304; avaliação gravada às 21h20:14.745. Consulta independente às 21h20:43 confirmou source_matches=true e fresh=true (valid_until 21h22:14), lease liberada, follow-up pending, sent_at NULL e send_authorized=false. Nenhuma mensagem oficial nova desde 19h41:29. Logs de gateway na janela 21h11:29–21h21 contêm dois registros da RPC crm_recovery_purchase_episode, coerentes com leitura e rechecagem do snapshot.

Resultado blocked com order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved e unattributed_orders_in_window. Zero tentativas e automatic_sends_enabled=false. Isso comprova o caminho instalado Cloudflare → autenticação → claim → snapshot com RPC nova → rechecagem de fontes → gravação/liberação, sem nova mensagem; não comprova oportunidade elegível nem venda recuperada. A frescura acima vale para o instante consultado; depois de 21h22:14 é evidência histórica até uma avaliação nova.

O último interesse semântico do episódio é de 19h06:14, product_not_identified/unconfirmed; a menção resolvida anterior não foi inventada como preferência atual. tintim_purchase_stage_present=false e tintim_review_required=false não significam compra inexistente. Para homologar em produção a exceção de compra antiga seria necessária evidência LEGÍTIMA correspondente no mesmo telefone autorizado; não fabricar etapa/venda, trocar contato ou pedir outro teste de produto/timer só para melhorar o resultado.

Próxima prioridade comercial: melhorar a conciliação de compras e identidade dos pedidos e estabelecer a base real de permissão, mantendo a avaliação conservadora até haver cobertura suficiente. Nenhuma solicitação de nova mensagem é necessária para comprovar esta execução. Não abrir a loja ou alterar disponibilidade/horários apenas para remover bloqueios de teste.

Reversão imediata deste corte: desabilitar episode_scope e desligar CRM_RECOVERY_EPISODES_ENABLED; preserva dados, filas, HMAC/JWT e envios OFF. O escopo desta rodada expira por condição SQL às 23h11:29, sem renovação automática. Fora da exceção finita, proteção anterior permanece. Restauração estrutural adicional usa os backups atuais e o arquivo de restauração já testado, mantendo a flag OFF.

PR #67 permanece em rascunho; sem merge ou publicação Pages. Código de transporte não foi retestado com nova mensagem, pois nenhum novo ingresso foi necessário para esta prova. Fotos/binários, checkout, pagamentos, QZ, catálogo e Meta/Tintim não foram modificados.


## Referências de pedidos pelo canal oficial — candidato sobre 1796312

Auditoria confirmou que a mensagem atual gerada em app/order-checkout.ts inclui o número sequencial do pedido, mas NÃO inclui o tracking_token: o argumento _trackingUrl é intencionalmente ignorado nesse formato. Há teste de navegador histórico que ainda menciona token; ele não é prova do comportamento atual. Não restaurar o link de acompanhamento nem expor token por conveniência. O telefone do checkout é opcional e o contrato existente do Tintim grava order_reference como candidate, não identidade confirmada.

Implementado candidato de captura oficial, independente de lead Tintim: envelope/HMAC/ativos → escopo original de servidor → mensagem inbound direta → cabeçalho atual exato → referência privada mínima → reavaliação. Encaminhamentos, citações, mídia, saída da loja, cabeçalho de homologação, múltiplos números/cabeçalhos, IDs repetidos inclusive entre direções, data futura ou fora de 24h não geram referência. O corpo, nomes, telefone, CPF/Pix, valor e tracking_token não são persistidos ou devolvidos pelo inspetor. O número é somente uma indicação candidata fornecida pelo cliente, não prova de propriedade ou pagamento.

Migração CLI 20261118010932_crm_recovery_official_order_references.sql prepara order_references no schema privado, RLS e sem acesso direto dos papéis da API. Captura/read são RPCs somente service_role; exigem evento oficial com telefone/direção/ID/horário correspondentes e observação semântica privada já capturada. Número, direção, horários ou identidade normalizados não vêm do request HTTP. Backend localiza pedido existente e mantém resolution_status matched/unmatched/conflict, sempre reference_status=candidate. Nenhum status confirmed está disponível para a associação.

Número inexistente/ambíguo, pedido fora da faixa temporal, telefone diferente ou pedido já referenciado por outro contato NÃO viram uma associação aceita por engano. A indicação fica registrada como dúvida sem order_uuid e continua bloqueando na próxima leitura, sem depender de guardar a mensagem bruta. Alteração de número para o mesmo message_id é conflito, e duplicata idêntica não renova retenção. Locks por mensagem e pedido protegem a associação; FOR KEY SHARE apenas preserva integridade do FK, sem marcar pagamento. Exclusão externa de pedido deixa referência sem UUID e a leitura passa a unmatched; não apagar silenciosamente a evidência.

Snapshot lê/restaura as referências por correspondência ao evento oficial e consulta novamente o pedido. Associação candidata, mesmo com pedido paid, não vira pagamento confirmado para o contato: mantém purchase_or_order_requires_reconciliation. Dúvidas sem pedido também preservam esse bloqueio. Rechecagem e source_revision incluem referências e pedidos associados para invalidar leases se a fonte mudar. Expurgo existente passa a remover somente referências privadas expiradas, com lote limitado; leitura restrita a 24h, retenção máxima operacional de 30d. Não há escrita em orders, pagamentos, consentimento, atribuição ou Meta.

Flag nova CRM_RECOVERY_ORDER_REFERENCES_ENABLED começa OFF nos dois caminhos de servidor. Com ela OFF, nenhuma RPC nova de captura/leitura é chamada. Com ela ON, a leitura usa a janela de 24h ligada ao evento oficial, sem recortar pelo created_at de servidor: a primeira mensagem pode preceder a criação da conversa por milissegundos. O horário original permanece intacto; pedidos criados no mesmo segundo do timestamp Meta são compatíveis com a precisão do protocolo, mas segundo posterior fica sem associação. source_revision usa janela correspondente e nunca usa horário de recebimento como data da mensagem/venda.

Validação local final: 51/51 testes direcionados, incluindo seis testes novos e integração PostgreSQL real/PGlite 0.5.14. Cobertos HMAC, ativos/escopo, redaction, repetição entre direções, cotas de horário; mensagem anterior ao registro da conversa; captura assinada → SQL privado → leitura sem nova mensagem; pedido pago com identidade candidata; referências não resolvidas persistentes; conflito entre contatos; mensagem imutável/TTL; lease invalidada; ACL/RLS, perda do pedido e expurgo sem alteração financeira. git diff --check e igualdade do dashboard Worker passaram. Dependências temporárias foram recompostas após manutenção do ambiente; nada mudou em package/lock. CI remota do novo SHA ainda deve ser conferida.

### Impacto e instalação/reversão deste candidato

Não instalado por esta preparação. O incremento anterior de episódios permanece em produção em sombra, com a lista original e envios OFF. Este candidato não altera checkout, mensagem gerada, catálogo/fotos, QZ, pedidos/pagamentos, transportes Meta/Tintim, Worker ou Pages. Não exige novo campo do cliente ou preenchimento manual pela Luciane. Também NÃO resolve sozinho a identidade/atribuição de todos os pedidos, nem certifica ausência de compra externa ou cria permissão de contato.

Antes de instalar: conferir CI exata; exportar bundles atuais e DDL/ACL de source_revision e purge; comparar a fonte produtiva; criar flag false; migração transacional com tabela vazia; preservar expurgo/RLS/grants; instalar dois bundles completos OFF; depois eventual ativação somente na allowlist original, sem pedidos ou eventos de venda sintéticos. É uma nova captura e não deve ser confundida com autorização de envio.

Reversão primária: CRM_RECOVERY_ORDER_REFERENCES_ENABLED=false nos dois caminhos. Manter a estrutura privada e seu expurgo, para não abandonar a retenção das evidências já registradas. Se necessário restaurar bundles atuais capturados antes deste corte; não usar automaticamente backups de incrementos anteriores. Não restaurar um purge anterior que esqueça a tabela nova sem preservar sua limpeza. Não remover registros para facilitar homologação.

Próximo bloqueio real: estabelecer prova mais forte para uma associação virar identidade confirmada, sem usar o número público como credencial, e melhorar cobertura de compras/permissão. As referências candidatas não removem as proteções existentes nem demonstram venda recuperada.


## 17/11/2026 — Referências oficiais instaladas em sombra às 22h37

Código funcional b2f2f2caeae519eeb9cd320aa04551ec881cc813, sobre 1796312; backup antes da mutação em 64830685bf62679701f55acc1e5ba518495a49f0, diretório docs/edge-release/rollback/20261117-official-order-references/. PR #67 permanece aberto em rascunho, sem merge ou Pages.

CI desse código confirmada: governança 44216316204, continuidade 44216316164, recuperação PR 44216316256 e push 44216307998, CRM comercial 44216316290 — todos success. Logs: 117/117 testes de recuperação, 1.029/1.029 regressões comerciais; tipagem específica e build aprovados. Validação local direcionada 51/51 registrada acima.

Corte executado com CRM_RECOVERY_ORDER_REFERENCES_ENABLED=false inicialmente às 22h35:42. Migração produtiva crm_recovery_official_order_references, versão 20261118013606, corresponde à fonte CLI 20261118010932. Quatro corpos SQL recuperados e comparados exatamente com o candidato. RLS=true; sem SELECT direto de anon/authenticated/service_role; RPCs novas só postgres/service_role; source_revision apenas postgres. Nenhum WARN/ERROR novo nos advisors em comparação ao baseline, desconsiderando observed_at.

Bundles completos instalados OFF e recuperados para comparação: webhook v28 (20 arquivos) e reevaluate v16 (21). Flag ON às 22h37:23; metadados passaram a webhook v29 ACTIVE, SHA256 5d6ce2ba3581a4392476b8d598a099c9ae4dc2e2d3544bc23145bd481a25636b; reevaluate v17 ACTIVE, SHA256 7d7525aeec15ec9ebe5923b230ced5d347083e0a4caaa8a33a66a8d31e39866c. Arquivos ativos idênticos ao candidato; verify_jwt=false anterior no transporte Meta e true/HMAC no timer preservados. Lista original e outras flags preservadas; nenhuma credencial Meta/gateway foi lida ou modificada.

O registro privado começa vazio. Captura não é retroativa: este corte não fabricou mensagem/pedido/referência nem requereu nova mensagem de teste. Uma referência futura legítima do telefone autorizado poderá ser localizada automaticamente; identidade continuará candidate. Sem ocorrência desse cabeçalho após o corte, captura produtiva de uma referência NÃO está homologada, embora o ciclo com evento assinado/SQL/timer tenha passado em PostgreSQL isolado.

A exceção finita de episódios anterior continua com expiração 23h11:29 do dia 17/11; não foi renovada. Isso não é validade universal do interesse ou da janela WhatsApp. Os limites de leitura por horário original continuam em vigor. Reversão desta captura: flag OFF e manutenção de RLS/expurgo da tabela nova; se necessário, bundles anteriores completos estão no backup deste corte. Não restaurar purge antigo deixando novas evidências sem retenção.

Nenhuma escrita financeira, mudança de pedido/pagamento, consentimento, estoque, horário, disponibilidade, mensagem comercial, contato extra, transportes Meta/Tintim, QZ, checkout, fotos, Worker/Cron ou publicação de site. automatic_sends_enabled=false e zero tentativas nas verificações.

### Reavaliação produtiva de 22h40 — comprovada sem nova mensagem

Ledger autenticado: tick 1794966000, recebido às 22h40:13.765. Decisão gravada às 22h40:16.914; consulta independente às 22h40:43.221 encontrou fresh=true, source_matches=true, lease livre, sent_at NULL e send_authorized=false. Validade dessa decisão até 22h42:16; depois é evidência histórica até outra avaliação. Próxima leitura não foi antecipada nem teve relógio ajustado.

Gateway no intervalo 22h37:23–22h40:44 registrou DUAS chamadas à RPC crm_recovery_read_order_references, coerentes com snapshot e rechecagem. Últimos eventos originais do telefone piloto permanecem inbound 19h35:53 e app_echo 19h41:29. Referências privadas=0, como esperado sem cabeçalho legítimo novo após instalar captura. Isso comprova leitura automática da nova fonte no timer; não comprova captura produtiva de referência nem associação de pagamento.

Resultado blocked: order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved, unattributed_orders_in_window. Envios false, tentativas zero. Não confundir execução periódica e conciliação candidata com oportunidade elegível ou venda recuperada. Loja fechada é impedimento comercial esperado; não abri-la para favorecer teste. Produto antigo resolvido não substitui interesse novo sem confirmação.

Próximo passo: concluir prova de identidade/compra e base legítima de permissão, com melhoria isolada antes de novo corte; preservar indícios ambíguos para impedir lembrete inadequado. Captura produtiva poderá ser verificada quando houver ocorrência real compatível, sem requisitar outra mensagem neutra ou repetir teste de reconhecimento já concluído.


## 18/11/2026 — Compra anterior do site e novo interesse: candidato coordenado, NÃO instalado

Base remota confirmada 22b1721385ea0e0bebf44b9c1dd533b3d42045c3, branch feat/crm-recovery-shadow-20261115 / PR #67 em rascunho. Consulta produtiva de 03h59 America/Belem: automatic_sends_enabled=false, zero tentativas, referências privadas=0; escopo anterior expirado desde 23h11:29 do dia 17/11, sem renovação. Agendador recebeu chamada às 03h55:13. Reavaliação v17/hash 7d7525aeec15ec9ebe5923b230ced5d347083e0a4caaa8a33a66a8d31e39866c preservada. Nenhuma mutação produtiva realizada neste incremento.

Lacuna encontrada no código: além da etapa Tintim, um pedido pago nas últimas 24h podia suprimir um novo interesse do mesmo telefone sem distinguir o episódio. A regra candidata só considera histórico um pedido do telefone exato, pago E concluído, com created_at <= paid_at <= updated_at < novo interesse oficial. updated_at representa quando o registro já era conhecido, nunca data da venda nem início da janela WhatsApp. Pedido em preparo/sem conclusão, atualização tardia, datas ausentes/inconsistentes, telefone conflitante, referência candidata ou ausência de interesse continuam exigindo conciliação. Pedido criado/pago no episódio atual mantém supressão. Não inventa pagamento a partir de impressão, imagem, forma de pagamento ou pedido aceito.

Implementação: recovery-site-purchase-episode.mjs e snapshot leem updated_at e classificam somente sob CRM_RECOVERY_EPISODES_ENABLED e escopo SQL ativo. Fora desse escopo ou com flag OFF, guarda anterior permanece. Pedidos repetidos entre consultas são deduplicados antes da contagem. Somente contagens fechadas adicionais; nenhuma PII financeira/pessoal no resultado.

Migração CLI 20261118070703_crm_recovery_site_purchase_episodes.sql prepara predicado privado site_order_requires_review, sem EXECUTE para PUBLIC/anon/authenticated/service_role. As duas funções SQL existentes de fila/preflight usam o predicado nos três pontos de consulta a pedidos. A referência candidata não ganha identidade só por ter rótulo confirmed no Tintim. A revisão privada passa a incluir created_at do pedido: uma mudança somente dessa data também invalida a lease. Definições-base das três funções comparadas com produção e iguais antes da edição. Sem nova tabela, endpoint, RPC pública, permissão, contato ou relógio externo.

87/87 testes locais direcionados passaram. Treze casos novos de classificador/snapshot; testes PostgreSQL existentes ampliados com migrações reais, RPC de escopo real, dois consumidores SQL, associação candidata, registro tardio, decisão invalidada por created_at sem updated_at, expiração, ACL e reversão estrutural. Leitura de conciliação não altera a linha financeira. git diff --check e dashboard Worker íntegros. CI remota do novo SHA deve ser conferida; não reutilizar contagens da base como resultado do candidato.

Instalação ainda pendente. Este incremento não está nas Edges nem no SQL produtivo e não reativou o piloto vencido. Futuro corte precisa ser coordenado: backup fresco de três definições/ACL e bundles completos, escopo desabilitado e flag OFF; migração; ambos os bundles incluindo o módulo novo; comparação de fontes; somente então eventual escopo único/finito autorizado. Não instalar só o snapshot ou só SQL para homologar a regra. Preservar send_authorized=false e automatic_sends_enabled=false.

Reversão primária exige escopo SQL desabilitado E CRM_RECOVERY_EPISODES_ENABLED=false: a flag Edge sozinha não desfaz guardas SQL. supabase/prepared/recovery-site-episodes-restore-functions.sql contém as três definições anteriores lidas em produção nesta auditoria, com delimitadores completos e teste de execução no PostgreSQL isolado. Arquivo é restauração candidata, não prova de reversão produtiva executada. Manter o helper privado revogado e sem uso, estruturas/expurgo anteriores e restaurar bundles coordenadamente se necessário. Nenhum pedido, pagamento, horário, consentimento ou fotografia deve ser alterado para demonstrar êxito.

Continuam pendentes: identidade forte de pedidos sem telefone, cobertura de compras diretas/lançamentos manuais tardios, base legítima de permissão e oportunidade elegível em produção. Referência por número e ausência de gatilho não certificam compra nem abandono. Não pedir nova mensagem neutra ou repetir reconhecimento/timer já homologados. Nenhuma alteração em checkout, Meta/Tintim, QZ, estoque, fotos, Worker/Cron, Pages ou Gestão; sem merge/envio.


### CI remota confirmada — candidato 8285000bad5c2131655b410a70909e107e7363dd

Cinco execuções concluíram success: continuidade 44257411469, governança 44257411369, CRM comercial/tipagem/build 44257411374, recuperação PR 44257411373 e push 44257401496. Logs confirmam 130/130 testes de recuperação (incluindo PostgreSQL e workerd) e 1.042/1.042 regressões comerciais; tipagem específica e build aprovados. Fontes locais testadas e árvore enviada ao GitHub foram comparadas e idênticas. Este registro posterior altera somente documentação; a prova funcional pertence ao SHA acima.

Candidato completo e reversão testados, ainda sem aplicação produtiva da migração ou dos novos bundles. A expiração anterior permanece respeitada. Próximo corte deve preservar escopo SQL OFF/flag OFF na instalação e exigir validação específica da eventual nova janela finita do piloto original, sem envio, contato extra ou nova mensagem para repetir produto/timer.


## 18/11/2026 — Compra anterior do site: corte produtivo instalado em sombra

Autorização específica do proprietário recebida após apresentação do candidato, testes e reversão: instalação SQL + duas Edges e nova janela de 30 minutos, exclusivamente no telefone original, sem envios. HEAD de entrada bdaef3dae2cb536426a2fea6c042ab68bfdd647b; código funcional 8285000bad5c2131655b410a70909e107e7363dd, com CI 130/130 recuperação e 1.042/1.042 regressões, tipagem específica/build aprovados. Todas as cinco execuções do HEAD documental de entrada também success.

Backup fresco 18f9f7faffe2e7768d3fb7e7d582d35d8ca01e42 em docs/edge-release/rollback/20261118-site-purchase-episodes/: bundles integrais webhook v29 e reavaliação v17, três definições SQL/ACL/owner. DDLs atuais comparadas literalmente com o arquivo de restauração já testado. Sem usar backup de incremento anterior por suposição.

Corte com CRM_RECOVERY_EPISODES_ENABLED=false às 04h30:13 e escopo SQL desabilitado às 04h30:56. Migração crm_recovery_site_purchase_episodes aplicada, versão produtiva 20261118073056, equivalente à fonte CLI 20261118070703. Quatro corpos SQL instalados iguais ao candidato. ACLs das três funções existentes preservadas; helper privado somente postgres, sem execução direta de service_role/anon/authenticated/PUBLIC. Nenhum alerta WARN/ERROR novo nos advisors, excluindo observed_at.

Bundles instalados com flag OFF: webhook v31, 21 arquivos, SHA256 22ec859a1570de916e14eaa5c63ba4ba68473fc57ecb2dd23d854a1a84582b68; reevaluate v19, 22 arquivos, SHA256 36f52b7da76c541bdc7498dd23ab133f67e6f094a7f3a1287570226fae71958d. Após flag true às 04h31:50, metadados webhook v32 e reevaluate v20 ACTIVE; bundles idênticos, JWT Meta anterior false e JWT/HMAC da reavaliação true preservados. Novo módulo incluído nos dois import closures. Lista original e demais flags/segredos preservados.

Escopo único original reativado às 04h32:34.396, expiração às 05h02:34.396 (America/Belem), diferença exata de 30 minutos. A atualização só alterou enabled/enabled_at/expires_at da configuração privada; conversa/cliente/telefone preservados. Guarda exigiu escopo anterior inativo, uma única linha, envios false/zero tentativas e identidade coincidente com os eventos oficiais já existentes, sem imprimir identificadores. Não renovar automaticamente.

Consulta às 04h33:39: zero pedidos recentes do site com telefone correspondente, zero referências privadas do piloto; última mensagem oficial segue 19h41:29 de 17/11 e interesse mais recente 19h06:14. Não existe caso produtivo legítimo de pedido pago/concluído anterior para declarar homologação comercial dessa distinção neste telefone. O caso de negócio permanece comprovado em PostgreSQL isolado; não criar pedido/venda, alterar horário, trocar contato ou pedir repetição de teste de produto/timer para favorecê-lo. Execução periódica após instalar é prova separada.

Reversão primária: desabilitar escopo SQL E CRM_RECOVERY_EPISODES_ENABLED=false. Expiração também restaura a proteção anterior mesmo com flag true. Restauração estrutural, se necessária, usa supabase/prepared/recovery-site-episodes-restore-functions.sql conferido com o backup fresco e bundles completos deste corte; manter helper revogado, estruturas privadas e expurgo. Nenhuma reversão foi necessária até esta conferência.

automatic_sends_enabled=false e zero tentativas de entrega. Nenhuma mudança financeira, de consentimento, compra, disponibilidade, horário comercial, catálogo/fotos, QZ, checkout, Meta/Tintim, Worker/Cron, Pages, main ou Gestão. PR #67 permanece aberto em rascunho, sem merge. A janela técnica não representa permissão comercial, oportunidade elegível ou venda recuperada.

### Primeira execução após o corte — 04h35

Tick 1794987300 autenticado às 04h35:13.236; decisão gravada às 04h35:14.954. Consulta independente às 04h35:32.736: fresh=true, source_matches=true, lease livre, follow-up pending, sent_at NULL e send_authorized=false. Validade até 04h37:14.954; depois tratar como histórico até nova avaliação. Nenhum horário da fila foi alterado para conseguir seleção. Gateway de 04h32:34–04h35:35 registra duas chamadas à RPC de episódios e duas à leitura de referências, coerentes com leitura/rechecagem na versão instalada.

Resultado blocked: order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved, unattributed_orders_in_window. Última mensagem oficial permanece 19h41:29 do dia anterior. Envios false e tentativas zero, conferidos também às 04h35:52. Escopo ativo=1; helper privado sem EXECUTE de anon/authenticated/service_role. A prova demonstra execução periódica da versão instalada e consistência da decisão; não demonstra oportunidade elegível, nova captura de referência, caso real de recompra do site ou venda recuperada.

Piloto expira às 05h02:34.396 sem renovação automática. Essa expiração é um predicado SQL testado, não uma ação futura do chat. Sem necessidade de outra mensagem, abertura da loja ou mudança de produto para concluir esta prova. Próxima prioridade comercial permanece conciliar identidade/compra e estabelecer base real de permissão, mantendo revisão nos casos ambíguos.


## 18/11/2026 — Expiração conferida e proteção por andamento real, candidato

HEAD remoto b332888a92ff21659ba1250fc0280f8cf39b9687 confirmado, PR #67 aberto em rascunho. Consulta produtiva às 05h40:59 America/Belem confirmou active_scopes=0, vencimento original 05h02:34.396, automatic_sends_enabled=false e zero tentativas. Agendador recebido às 05h40:13. Não renovar a exceção, desligar Worker/DUE ou alterar fila para repetir a prova: expira a exceção de recompra, enquanto a análise em sombra restrita continua.

Lacuna identificada nas frases reais fornecidas pelo proprietário: Já saiu e Já pode fazer a retirada não correspondiam à gramática anterior, embora possam indicar atendimento já em execução sem gatilho Pedido confirmado. Candidato reconhece essas duas mensagens completas e a macro completa de preparação apresentada, somente em app_echo oficial assinado e no escopo já autorizado. A macro exige texto completo e intervalo positivo/ordenado de minutos. Negação, pergunta, condicional, promessa isolada, texto de terceiro, citação, encaminhamento, imagem, URL, complemento contraditório e simples recebimento/aceitação do pedido não viram sinal por substring.

Esses sinais somente acrescentam purchase_or_order_requires_reconciliation, sem confirmar compra/pagamento, calcular valor, registrar receita, disparar Meta/Tintim, mudar pedido ou conceder permissão. Reutilizam a projeção privada possible_purchase já existente; a string interna usada para gerar essa projeção não é uma declaração literal do cliente nem prova financeira. Horário/identidade/direção vêm do evento oficial e corpo permanece efêmero. Foto de comprovante, impressão e forma de pagamento continuam insuficientes para confirmar pagamento.

Persistência e leitura do timer usam os caminhos existentes, sob CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED. O interesse no produto é preservado; mensagem operacional anterior a novo interesse explícito não bloqueia vitaliciamente o contato. Captura é prospectiva: não reclassificar screenshots ou mensagens antigas sem conteúdo autorizado e evidência de origem. Não pedir nova mensagem para repetir reconhecimento/relógio.

69/69 testes locais direcionados passaram, com seis casos novos de gramática/inspeção/snapshot e ampliação da integração PostgreSQL real: app_echo assinado → semântica privada → leitura posterior sem webhook → conciliação com pagamento ainda pending. Cobertos persistência sem texto/valor, preservação do produto, novo interesse após sinal antigo, flag OFF, identidade/direção/HMAC, falsos positivos e ausência de promoção de mídia. git diff --check e dashboard Worker íntegros. CI remota do novo SHA ainda deve ser conferida.

Candidato NÃO instalado neste incremento. Sem migração, RPC, tabela, flag nova ou mudança de permissão. Produção permanece com webhook v32 e reavaliação v20 do corte anterior. Futuro corte pode ser agrupado com outras melhorias verificadas para evitar homologações redundantes: preservar ambos os bundles completos, lista original, autenticação e envios false; comparar fontes e validar sem compra/horário/consentimento fabricados. Não abrir outra janela de exceção apenas para validar gramática.

Reversão preferencial: restaurar a versão anterior do classificador nos dois bundles. Preservar evidências e bloqueios de conciliação já capturados; não apagar observações nem reduzir guardas para tornar um contato elegível. Desligar a flag de sinais afetaria também os sinais de pagamento já homologados, portanto não é necessário como reversão isolada deste incremento.

A melhoria reduz dependência dos gatilhos tardios para impedir lembretes inadequados; não comprova ausência de compra quando nenhum sinal aparece. Permanecem pendentes conciliação/identidade dos pedidos e permissão legítima antes de qualquer envio. Sem ampliação de contato, alteração produtiva, mensagem, merge/Pages ou mudança em checkout, QZ, fotos, catálogo, estoque, Meta/Tintim e Gestão.

### CI remota e próximo bloqueio — código 8e007a57d82de16274d99190f76a9e54d0ba7180

Cinco execuções success: governança 44269927846, CRM comercial 44269927334, continuidade 44269927332, recuperação PR 44269927357 e push 44269919129. Logs confirmam 136/136 testes de recuperação e 1.048/1.048 regressões comerciais; tipagem específica/build aprovados. Esta nota posterior é documental; o SHA funcional validado é o acima. Candidato de andamento ainda não instalado, sem nova janela ou evento produtivo de homologação.

Auditoria da próxima trava: recoveryPermission continua exigindo evidência auditada, sem inferir consentimento de produto, compra, clique ou visita. A política oficial consultada em 18/11/2026 (atualizada em 23/09/2026) mantém requisitos de opt-in e interrupção; permite resposta livre e automação dentro da janela, com escalonamento humano. Fonte primária: https://whatsappbusiness.com/policy/ (redirecionamento oficial de business.whatsapp.com/policy). Não usar material de terceiros/preview com regras antigas de cobrança para substituir essa verificação.

Interpretação conservadora mantida neste incremento: janela técnica não é concessão promocional automática. Próxima implementação deve reduzir o preenchimento manual mediante captura de uma manifestação REAL de permissão, com escopo/finalidade e contexto verificáveis, sem conceder consentimento aos clientes antigos e sem alterar os campos atuais nesta rodada. Nenhuma mensagem de solicitação de permissão foi enviada, nem foi proposta liberação geral por simples interesse. Cobertura de compras diretas continua não certificada; ausência de sinal não basta para elegibilidade.


## Permissão contextual: implementação candidata de 18/11

A base remota 8c65aeb foi preservada. Novo módulo recovery-context-permission.mjs interpreta somente a pergunta versionada exata da loja e PODE LEMBRAR/CANCELAR LEMBRETE recebidos em webhook oficial assinado. Migração 20261118090540 adiciona ledger privado, escopo único finito e RPCs de serviço. Identificadores/direção/telefone/horário original ligam o aceite ao interesse vigente; texto não é persistido no ledger. “Sim”, compra e imagem não concedem permissão. Nenhum campo de consentimento global é alterado.

Pergunta e aceite são evidências, não comandos de envio. Pergunta não substitui atendimento; aceite exige a resposta real da loja para sair de pending_service. Retirada, negativa fora do chat registrada na auditoria, opt-out, alteração de fonte/contexto, expiração e sent_at anterior impedem uso. Nova pergunta sem novo aceite não restabelece uma autorização cancelada. A fila SQL e o preflight mantêm os demais bloqueios. Cobertura de pagamentos e compras diretas ainda não está certificada; consentimento válido sozinho não torna uma oportunidade elegível.

Implementação começa com CRM_RECOVERY_CONTEXT_PERMISSION_ENABLED OFF e tabela de escopo vazia, até uma conversa e no máximo 24h. Captura atual suporta app_echo oficial do Business App; não presumir eco de envio Cloud API. Entrega automatizada da pergunta/ack não está implementada. Antes de qualquer envio faltam revisão do conteúdo, consumo atômico/finalidade da autorização, opt-out global durável e validação completa das compras. Uma futura implantação exige corte coordenado/backup fresco e validação específica do piloto original; nada disso foi executado neste incremento.

86 testes locais passaram, incluindo PostgreSQL real, permissões de papéis/RLS, assinatura, pipeline e reavaliação sem webhook novo. CI remota do novo SHA ainda pendente nesta entrada. Produção segue v32/v20, automatic_sends_enabled=false e zero tentativas, escopo anterior expirado. Reversão desliga escopo/flag preservando negativas e retenção; não restaurar funções antigas que ignorariam retiradas. Texto exato proposto, testes e ponto de retomada estão no Checkpoint Vivo.


CI posterior conferida para 95f6041e8b260725fd9cb4b6a9bbdc40a4b24bc7: cinco execuções aprovadas; 145 testes de recuperação e 1057 comerciais, build e tipagem CRM. Candidato continua sem instalação produtiva. Evidências e IDs das execuções no Checkpoint Vivo.


## Reserva de preparação contextual — candidato de 18/11

Sobre c2c316c, a migração 20261118094448 acrescenta uma reserva privada por interesse/follow-up, ligada à autorização atual, finalidade fechada, digest de conteúdo e revisão. Somente o dono do schema pode executar a função; nenhum papel de API ganhou acesso e nenhum agendador/sender a chama. Não consumir autorização em sombra. Retorno sempre send_authorized=false.

Exige decisão candidata fresca, sem impedimentos, sem lease ativa e com fontes idênticas, além de permissão/escopo atuais. Captura e reserva compartilham trava transacional. Apenas uma chamada recebe identificador; repetição não recebe token. Uso segue bloqueado após timeout/crash, exclusão do follow-up ou nova pergunta sobre o mesmo interesse; novo interesse ainda precisa de nova autorização e dos demais controles. Retenção acompanha o ledger da pergunta. Não registrar pagamento, envio ou tentativa por reservar.

86 testes locais aprovados com novos cenários SQL. Teste separado em CI com PostgreSQL temporário e conexões independentes aguarda resultado remoto; o teste local serializado não é prova dessa concorrência. Digest não valida conteúdo; faltam geração/validação do teor e checagem final comercial, além de opt-out global durável, identidade e cobertura de compras. Reserva não impede novas compras/respostas posteriores nem autoriza transporte. Sem instalação produtiva. Reversão preserva consumos/retiradas e limpeza, evitando restauração que os ignore.


Evidência posterior: bfe0f0877b22e3a5a1b848596019d12278d65c05 passou cinco execuções, incluindo 145 testes principais e um teste real de duas conexões PostgreSQL em CI. Revisão posterior confere clock_timestamp() após as travas para impedir uso de decisão/escopo vencido durante a espera; teste local passou. Conferir o SHA final e seus checks/descrição do PR, sem tratar o candidato como instalado.


## Prévia contextual — candidato de 18/11, base 59c53fc

Dois módulos novos geram somente prévia, disabled por padrão e sem rota/cron/reserva/transporte. Duas avaliações completas + releitura do telefone único/follow-up detectam alterações; validade máxima de 30 segundos e send_authorized=false. Não dispensam cobertura de compras. preparation_context só é projetado na opção interna message_preparation_enabled, não ligada nas Edges. IDs/horário do interesse e pergunta vinculam o contexto; texto arbitrário/telefone não é devolvido. O hash de fontes da prévia não substitui source_revision SQL da reserva.

Rascunho context-message-1 para o exemplo canônico, sujeito a revisão de conteúdo:

> Olá! Aqui é da Luciane Oliveira Doces. Você ainda tem interesse em Cascão Trufado — Prestígio? Posso te ajudar por aqui ou você pode fazer o pedido pelo site:
> https://lucianeoliveiradoces.com.br
>
> Para cancelar este lembrete, responda CANCELAR LEMBRETE.

O nome vem do catálogo; Fatia, Cascão, Natal, pacotes/tamanhos/combinações de pipocas e embalagem de bebidas não são confundidos. Digest SHA-256 vincula o texto exato, não sua elegibilidade. Sem preços/escassez/pagamento inventados. 92 testes locais passaram; integração PostgreSQL liga o digest dessa mensagem à reserva SQL e recusa compra, resposta, cancelamento ou fonte alterada entre leituras. Prévia sozinha não consome autorização. CI final e SHA nos checks/descrição do PR #67. Nenhuma mensagem foi enviada nem código instalado em produção. O futuro executor ainda precisa integrar a reserva e rechecagem posterior, sem promover a prévia a autorização de envio.


#### Evidência remota e leitura comercial — 18/11 às 07h10 America/Belem

Código 706c47fcdf855e1a9d4277f7cebd00631f2bf00e: cinco execuções aprovadas (44282419385, 44282431966, 44282431903, 44282431916, 44282432067). Logs conferidos: 151/151 recuperação, 1/1 concorrência PostgreSQL independente, 1063/1063 comerciais, sete operações seguras, build e tipagem específica CRM. Não equivale a tipagem geral sem erros, instalação ou envio. Próximo commit é somente documental para preservar esta evidência.

Consulta somente leitura ao Supabase COMERCIAL às 10:10:15.445524 UTC (07h10:15 local): automatic_sends_enabled=false, delivery_attempts=0, active_episode_scopes=0, orders_open=false; tabelas context_permission_events e context_permission_uses ausentes. Último registro do piloto avaliado às 07h00:16.283, classification=blocked, send_authorized=false e valid_until=NULL: tratar como registro sem validade vigente, não como decisão elegível/fresca. Motivos registrados: order_check_incomplete, permission_unverified, store_closed, product_or_variant_unresolved, unattributed_orders_in_window.

Nenhuma janela renovada nem alteração produtiva nesta leitura. O impedimento comercial continua real: falta demonstrar compra/identidade/cobertura e permissão num episódio válido, além da loja estar fechada na consulta. Nova mensagem neutra ou abertura artificial da loja não resolve esses pontos. O rascunho atual é prova de código/testes, não mensagem preparada para enviar ao cliente produtivo. Próxima prioridade deve fechar esses bloqueios e preparar corte coordenado revisável, evitando adicionar camadas de envio antes de uma oportunidade legítima.
