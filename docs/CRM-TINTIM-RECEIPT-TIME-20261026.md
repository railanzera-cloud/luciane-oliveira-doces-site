# Checkpoint — mensagens Tintim sem timestamp nativo (26/10/2026)

Projeto exclusivo: LOD comercial, GitHub `railanzera-cloud/luciane-oliveira-doces-site`, Supabase `edqiwvccmboyayojvuea`. NUNCA misturar Luciane Gestão/Boutique.

Origem `feature/crm-tintim-message-shape-diagnostics-20261026` commit `a8778bc27b0b11e33807e771ae8a1eec6955c259`.
Nova branch `feature/crm-tintim-receipt-time-20261026`.

## Evidência de produção
Consulta privada ao diagnóstico: 32 eventos na categoria `timestamp_missing`, flags `1010001000000000`. Campo message como string, from_me top-level, lead.phone disponível; nenhum dos campos de timestamp procurados. Sem eventos confirmados na tabela CRM até esta melhoria. Outras rotinas Tintim continuam entregando leads e referências de pedidos. Prints indicam Coexistence conectada ao Tintim.

## Correção
1. O extrator só aceita horário substituto para o formato real *message string + from_me top-level + lead.phone*. Esse horário é o instante de recebimento do webhook e não o horário original da mensagem. Outras estruturas sem horário continuam ignoradas.
2. Adiciona coluna `time_basis` para marcar `provider_timestamp` vs `webhook_received` em `crm_tintim_message_events`.
3. RPC `crm_record_tintim_message_v2` (service_role apenas): em modo fallback registra somente metadados, com idempotência SHA256, sem mexer em clientes, follow-ups ou finanças. Para origem com timestamp, preserva processamento antigo.
4. Dois controles independentes impedem automação com timestamp ausente: `apply_to_followups` e `allow_received_time_followups`, mais `received_time_enabled_at` e janela de 5 minutos para aquecimento. Por padrão o controle novo e o global ficam desativados. Só ativar após comprovar a contemporaneidade, direção e confiabilidade dos eventos reais, nunca por mera passagem do CI.
5. Antes de qualquer automação real de envio: exige meio oficial compatível com coexistência Tintim, política de consentimento, resposta, compra, janela permitida e custos. Envio permanece desativado com CHECK no banco.
6. O webhook original mantém hash de autenticação, URL, reconciliação de pedido e eventos de lead. Sem necessidade de novo ZIP Cloudflare ou alteração no Meta.
7. Homologação: tests node, build, TypeScript, SQL BEGIN/ROLLBACK (modo observe only e modo ativado simulado), implantação migração e Edge Function e inspeção de eventos sem conteúdo privado.

## Pendências
- Confirmar eventos reais pós-deploy: distribuição inbound/business_outbound com `time_basis=webhook_received`; nenhum corpo de conversa gravado.
- Checar se Tintim reenfileira mensagens históricas, se os horários de chegada correspondem aos envios e se não há comportamento de replay.
- Quando confiança suficiente, ativar somente agendamento sem envio e monitorar antes de qualquer automação comercial.
- Rotação coordenada da chave URL mostrada parcialmente no print anterior; não mudar sem sincronização com Tintim.

## Atualização de homologação em produção — 26/10/2026, 20h47 (America/Belem)
- Eventos reais confirmados via SQL após v10: **13+ eventos**, sendo 5 inbound e 8 business_outbound na primeira conferência, todos do mesmo telefone já presente no CRM, com sequências cliente→empresa→cliente. Um sinal adicional da empresa foi observado durante a checagem. A amostragem não prova exaustividade do Tintim.
- Todos os horários destes eventos têm `time_basis=webhook_received`, pois payload `message_create` não inclui timestamp original. **Não apresentar estes instantes como horário exato enviado no WhatsApp**; verificar possíveis atrasos/replays.
- Contato de teste efetivo tinha `commercial_opt_out=false`, `consent_status=unknown`, etapa externa `Fez Contato` e status de conversa `waiting_customer`. Não enviar follow-up comercial sem autorização.
- Controle de **agendamento/cancelamento apenas, sem envio** foi ativado em produção via transação SQL, com pré-condições verificadas:
  `apply_to_followups=true`, `allow_received_time_followups=true`,
  `received_time_enabled_at=2026-10-26T23:47:18.439177Z`.
- Guard da função exige `enabled_at<=now()-interval '5 minutes'`, portanto novas mensagens só serão elegíveis após **2026-10-26T23:52:18.439177Z** (20h52min18s America/Belem), e sem reprocessamento retroativo de mensagens anteriores.
- Após ativação, `crm_automation_settings.automatic_sends_enabled=false` permaneceu false; restrição de banco `CHECK(automatic_sends_enabled = false)` conferida. Não há mecanismo de envio automático. Conservar desativado.
- Mensagens do WhatsApp Business e dos clientes são **metadados somente**; nenhum conteúdo persistido. Não publicar Cloudflare nem alterar main por conta dessa ativação.
- Verificar em futuro fluxo real posterior ao aquecimento: inbound atualiza cliente; outbound posterior agenda lembrete de 45min; novo inbound cancela. Não afirmar essa sequência em produção até comprovada depois de ativar.
- Apenas 4 de 431 pedidos possuíam telefone preenchido na última verificação. Portanto compra confirmada não é detectável de forma abrangente por telefone; manter proteção por estágio Tintim e revisão humana.
- Documentação do Tintim declara que a plataforma é predominantemente observadora das conversas; não presumir API de disparo. Solução de envio deverá ser oficialmente compatível com a Coexistence Tintim e políticas da Meta.
