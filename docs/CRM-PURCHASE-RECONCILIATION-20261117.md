# Conciliação de compra para recuperação — auditoria de 17/11/2026

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
