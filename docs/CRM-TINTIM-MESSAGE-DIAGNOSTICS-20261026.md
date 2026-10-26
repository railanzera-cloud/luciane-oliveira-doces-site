# Continuidade: verificação dos eventos reais do Tintim (26/10/2026)

Projeto comercial LOD `railanzera-cloud/luciane-oliveira-doces-site`, Supabase `edqiwvccmboyayojvuea`, fuso `America/Belem`.
Branch `feature/crm-tintim-message-shape-diagnostics-20261026`, base consolidada `feature/crm-tintim-message-observability-20261026` `c64b92de696784907c7dd5a3902eda71a9798e65`. Sem mudança em main.

## Evidências anteriores à alteração
- `tintim-webhook` Edge Function v8 recebeu 101 POST entre 20:42 e 22:21 UTC, todos HTTP 200 (logs do Supabase function_edge_logs).
- `crm_tintim_message_events` tinha zero registros enquanto 3 novos contatos foram criados no CRM (45->48). Indicativo de payload sem os campos exigidos, mas sem confirmação da causa; nunca assumir que webhook funciona apenas pelo 200.
- Recebimentos originais de leads, origem e referências de pedidos continuam operacionais, não reescrever.
- `crm_tintim_observation_settings.apply_to_followups=false` e `crm_automation_settings.automatic_sends_enabled=false`.

## Instrumentação aditiva
- Migration `20261027002000_crm_tintim_message_diagnostics.sql` cria tabela agregada privada por motivo (parsed/direction_missing/phone_missing/timestamp_missing/timestamp_outside_window/invalid_payload/other) e 16 flags de presença de campos.
- Nem texto, telefone, cliente, mensagem bruta, IDs, URLs, chaves ou webhook token são gravados nessa tabela.
- RPC de registro exclusivo service_role; RPC de consulta exige membership `crm_staff_access`.
- Atualização somente da função existente `tintim-webhook`, mantém URL, hash de autenticação, referência de pedido e outros eventos.
- Reconhecer a variação do campo `event-type` no envelope sem ampliar agressivamente regras de atribuição; ainda exigir telefone, direção e data recentes para processar CRM.
- Em caso de falha na telemetria, webhook antigo continua trabalhando e devolvendo a resposta original; não interfere no Tintim.
- CI testa parser e proteções; transação SQL com ROLLBACK para validar enum/deduplicação; Edge Function deve ir para v9 após CI.
- Validar em eventos reais posteriores ao deploy com consulta agregada dos diagnósticos; habilitar agendamentos só quando os campos e direção forem corretos em eventos reais.
- Coexistence conectada ao Tintim; não desconectar; não configurar Meta novo nem disparos automáticos.
- Chave via URL já apareceu parcialmente no print anterior, exige futura rotação coordenada com Tintim, jamais alterar isoladamente.
