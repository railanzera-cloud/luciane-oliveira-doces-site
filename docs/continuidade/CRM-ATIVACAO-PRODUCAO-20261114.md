# Checkpoint operacional — CRM de acompanhamento (14/11/2026)

Projeto comercial exclusivamente: `edqiwvccmboyayojvuea`, `railanzera-cloud/luciane-oliveira-doces-site`.
Fuso America/Belem. Esta documentação NÃO habilita envio nem publica site.

## Base do frontend
- Referência: branch `fix/folheado-com-ninho-e-morango-v47141-20261114`, SHA `7dd4ddd7466beaf76404dc0ae070dfa56608c8cb`.
- ZIP fornecido e inspecionado: `LUCIANE_DOCES_V4_7_14_1_FOLHEADO_COM_NINHO_E_MORANGO_PUBLICACAO_MANUAL(1).zip`, 175 entradas, teste de integridade OK, SHA256 `c4a87dae4496da0e9acf3938f1921659521d53ec2ff15f974c88ceef908a0bf7`.
- Bundle do admin contém chamadas `crm_assisted_followup_review` e `crm_assisted_record_send`.
- Deploy atual de Cloudflare NÃO foi associado a ID/SHA nesta sessão; não afirmar correspondência entre ZIP e produção.

## Alterações efetivamente aplicadas em produção
- Precheck somente leitura: 29/29 hashes de funções CRM correspondentes à homologação antiga, funções novas ausentes e `automatic_sends_enabled=false`.
- Aplicada via conector Supabase: migração registrada `20261114193705 crm_assisted_followup_guard_20261114`; conteúdo proveniente de `supabase/migrations/20261031175609_crm_assisted_followup_guard.sql` no SHA de referência.
- Aplicada em seguida: `20261114193719 crm_assisted_activation_hardening_20261114`; conteúdo proveniente de `supabase/migrations/20261031183242_crm_assisted_activation_hardening.sql` no SHA de referência.
- Pós-checagem: três endpoints `crm_assisted_followup_review`, `crm_assisted_record_send`, `crm_record_action` presentes, `anon EXECUTE=false`, `authenticated EXECUTE=true`; `crm_record_action_core` negado a `authenticated` e `service_role`. `crm_consent_audit` com RLS ativo, SELECT negado a authenticated, zero linhas iniciais. Intervalo 45 min, transporte automático false.
- Não houve contato real, envio, edição de clientes ou alteração em pagamentos, Pixel/CAPI/Tintim, WhatsApp ou Cloudflare.
- O plano Supabase é Free e não dispõe de backup automático/PITR. Não foi obtido backup integral nesta sessão; as duas migrations são DDL pontuais, com SQLs de rollback versionados e testes de homologação anterior. Para mudanças de dados futuras, providenciar backup lógico externo e validá-lo.
- SQL de rollback existente: `tests/activation/rollback-hardening.sql` seguido de `tests/activation/rollback-guard.sql` na base de referência; preservar `crm_consent_audit` e dados nela registrados. **Não executar rollback sem diagnosticar e confirmar estado atual**.

## Sinais comprovados
- O webhook Tintim permanece ativo, com eventos novos.
- Auditoria posterior: ~640 clientes, 655 conversas, 213 lembretes pendentes, 0 tentativas de entrega e 0 eventos oficiais Meta, 803 pedidos. São contagens momentâneas.
- As mensagens observadas pelo Tintim têm `time_basis=webhook_received`; 0 com `provider_timestamp`. Não inferir horário original da mensagem a partir de recebimento.
- Consentimentos comerciais comprovados ausentes na fotografia. NÃO marcar todos como opt-in, nem enviar mensagens.
- Função `process-order-effects` do site possui mecanismo legado Meta Purchase com outbox, mas os Purchase da operação são acionados manualmente no atendimento/Tintim após confirmação. Não ativar o worker antigo nem duplicar eventos.
- A conexão histórica do Tintim foi relatada como Coexistence; identidade/possibilidade de roteamento do número no Graph/API não foram confirmadas nesta sessão. Não reconectar e nem substituir app.
- Supabase advisors reportam alertas preexistentes sobre SECURITY DEFINER públicos fora do novo CRM; tratar em revisão separada de impactos comerciais, sem alteração automática.

## Próximos portões
1. Confirmar com a Tintim/provedor existente se `message_create` pode incluir timestamp original, identificador imutável e direção das mensagens, inclusive `smb_message_echoes` do app. Aceitar apenas resposta documentada e payload sanitizado. Não pedir prints antigos à operação.
2. Alternativa se indisponível: verificar, sem mudar conexão, se o BSP atual expõe eventos assinados Meta na WABA já vinculada. O receptor `crm-whatsapp-webhook` está implantado mas sem mensagens registradas; não assumir callback ativo.
3. Captar consentimento realmente dado pelo cliente e evidência adequada; respeitar opt-out e dados mínimos. Não atribuir opt-in a 640 contatos antigos.
4. Validar Auth/PostgREST para as duas RPCs novas com conta real autorizada e negativo não autorizado; evitar dados sintéticos em produção. Abrir WhatsApp não é marcar envio.
5. Conferir deployment Cloudflare; validar painel no celular da Luciane, em atendimento real consentido. A fila de triagem e lembrete interno pode continuar observando sem disparar mensagem.
6. Só após ligação oficial e testes com conta controlada: planejar transporte API oficial com idempotência, tolerância a timeout, templates adequados, prova de entrega e medição de compras incrementais; manter `automatic_sends_enabled=false` até habilitação explícita e comprovada.

## Evidência
`docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md`, `docs/FOLLOWUP-CHECKLIST-ATIVACAO-20261031.md`, `docs/CRM-DELIVERY-OUTBOX-PREPARO-20261027.md`.
