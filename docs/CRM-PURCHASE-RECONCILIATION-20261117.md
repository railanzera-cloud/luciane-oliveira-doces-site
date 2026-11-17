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
