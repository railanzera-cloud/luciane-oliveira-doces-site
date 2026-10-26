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
