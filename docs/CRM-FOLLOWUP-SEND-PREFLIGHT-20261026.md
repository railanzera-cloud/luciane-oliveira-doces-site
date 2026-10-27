# CRM — guarda de elegibilidade para envio (26/10/2026)

Projeto isolado: LOD comercial, repo `railanzera-cloud/luciane-oliveira-doces-site`, Supabase `edqiwvccmboyayojvuea`. Branch `feature/crm-followup-preflight-20261026`, base `c662564b6e23069c42ed801ca21d6e87d54040e6`.

## Homologação de agendamentos
- Em 26/10 ~20:56 Paragominas, consulta de produção: 32 eventos `crm_tintim_message_events`, 10 vinculados ao CRM após aquecimento (6 inbound, 4 business_outbound); houve 2 cancelamentos `tintim_customer_replied` e 1 `tintim_new_business_reply`, 2 lembretes pendentes.
- Mensagens do Tintim chegam sem timestamp do provedor; `time_basis=webhook_received`. Esse dado é insuficiente para assegurar a janela oficial de serviço e mensagens que não são texto podem não aparecer.
- Apenas 4/431 pedidos tinham telefone no campo customer_phone na última auditoria; não confundir ausência de vínculo com ausência de compra.

## Migração read-only
- `20261027004000_crm_followup_send_preflight.sql`: nova função `crm_followup_send_preflight(p_follow_up_id uuid)` devolve JSON com `ready`, `reasons` e instante da validação, sem dados pessoais.
- Exige membro autorizado de `crm_staff_access` (ou `service_role` do backend); apenas o método recebe `EXECUTE` para authenticated e service_role; sem alterar RLS, pedidos, faturamento ou envio.
- Só indica elegibilidade com consentimento documentado, sem opt-out, lembrete pendente e vencido, conversa aguardando cliente e última ação da loja posterior à mensagem inbound.
- Janela de 23 horas exige hora de mensagem inbound confirmada pelo provedor (Tintim com `provider_timestamp` ou webhook Meta validado); **não** considera horário do recebimento do webhook como prova da janela legal/técnica.
- Qualquer sinal de compra (etapa Tintim, pedido pago por telefone, pedido vinculado) exige revisão antes do envio; etapa `Comprou` é sinal preventivo, não contabilização de receita.
- `automatic_sends_enabled=false` permanece restrição CHECK em produção; resultado atual será `ready:false` para qualquer contato. O preflight é `read_only_preflight_not_delivery_authorization`, não reserva nem envia.
- Para futuro serviço real de envio, uma checagem adicional transacional imediatamente antes do POST ao provedor é obrigatória; elegibilidade consultada anteriormente pode ficar desatualizada.
- Tintim monitora mensagens e expõe webhooks `message_create`, mas documentação não estabelece serviço de disparo pelo próprio Tintim. Não reconectar o mesmo número a outra Coexistence. Confirmar por escrito com Tintim/Meta BSP se a conta atual permite envio por API da mesma plataforma, com consentimento e custos.
- Não publicar Cloudflare, merge na main ou habilitar envios. Preservar a autenticação dos webhooks; planejar rotação coordenada da chave exposta parcialmente em captura.
