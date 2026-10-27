# Luciane Doces — Preparação da integração oficial de envio (27/10/2026)

Repositório: `railanzera-cloud/luciane-oliveira-doces-site`. Base integrada `feature/crm-mobile-operacao-clara-20261027` @ `ed8dccbdd5f27b0c4c51e404c01b02927494bffa`. Branch `feature/crm-outbox-envio-oficial-preparo-20261027`. Supabase EXCLUSIVO comercial `edqiwvccmboyayojvuea`.

## Fatos externos
Camila (Tintim) confirmou em 27/10 que o Tintim não oferece envio, mas pode receber webhooks/integração de uma ferramenta de atendimento que usa a API oficial. **Isto NÃO confirma que outro provedor pode usar o número já vinculado sem novo onboarding**. Tintim documenta plataforma comercial única na Coexistence, com possibilidades diferentes para integração via webhook. Ver: https://tintim.app/base-de-conhecimento/guia-tipos-de-conexoes-whatsapp-disponiveis-no-tintim/ e https://tintim.app/base-de-conhecimento/como-solicitar-a-integracao-do-numero-de-api-oficial-ao-tintim/ . Não remover conta ou reconectar QR.

## Backend implementado
- Migração `20261027193000_crm_delivery_outbox_holds.sql`: tabela privada `crm_delivery_outbox`, única por `follow_up_id`, FK, RLS, estados **somente `held` ou `canceled`**; motivos sem número ou conteúdo da conversa; função idempotente `crm_delivery_prepare_holds()` executável só por service_role/postgres em cron; `crm_delivery_readiness()` staff-only informa contagens e próximo bloqueio. **Não é uma fila de mensagens liberadas.**
- Não altera `crm_follow_ups`, pedidos, pagamentos, QZ Tray, pixels ou mensagens recebidas. Não armazena token ou corpo de WhatsApp. Revoga acesso a tabelas por anon/authenticated; os funcionários só veem agregados via RPC.
- Migração `20261027194000_crm_delivery_holds_cron.sql` registra cron cada cinco minutos deslocado 2 minutos do monitor existente. NENHUMA tentativa de envio por esse cron.
- `supabase/functions/crm-delivery-dispatch/transport.mjs` é apenas biblioteca não publicada, pronta para conexão oficial posterior. Exige explicitamente dois gates booleanos `certified` e `serverApproved`, valida metadados de Graph, retorna aceitação do provedor (NUNCA "entregue"), não registra segredos nem conteúdo. Testes usam apenas simulação de `fetch` e um token fictício. **Não existe worker de envio ativo.**
- O status é fail-closed. No teste reversível de produção foram observados 155 acompanhamentos (10 mantidos e 145 encerrados), repetição idempotente e bloqueio por JWT não autorizado; rollback completo antes da migração real. **Esses números são observações históricas, não mensagens enviadas.**

## Para permitir teste de envio real
1. Confirmar no Meta Business Manager / WhatsApp Manager a **WABA e Phone Number ID do MESMO número comercial**, qual aplicativo/Business Solution Provider detém conexão e se permite enviar pela Cloud API atual. Não fornecer access token no chat.
2. Confirmar coexistência sem migração ou desconexão do aplicativo, e Tintim continuar recebendo os eventos de campanhas e conversas. A resposta genérica da Camila não basta para este ponto específico.
3. Obter credenciais pela configuração autorizada do portfólio, registrar apenas como Supabase Edge Function Secrets, verificar assinatura/identidade do webhook oficial. O webhook `crm-whatsapp-webhook` já está instalado mas zerado, não ligá-lo ao Meta sem identificadores legítimos.
4. Construir worker de despacho com claim transacional, idempotência ao longo de tentativas, templates aprovados fora da janela, autorização documentada, preflight atômico, reconciliar estados webhook provider `accepted/sent/delivered/read/failed`, evitar retransmitir após timeout (resultado desconhecido).
5. Efetuar UM envio consentido para contato de teste controlado, verificar mensagem entregue, resposta cancelar followup e registro único. Somente então habilitar tráfego real com alçada da proprietária.
6. Jamais mudar `automatic_sends_enabled` agora. Não tocar no Supabase gestão `cztafxixnfpliaygniuj`, Boutique, resultados paralelo, main antiga, Cloudflare produção sem publicação autorizada.
