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
