# CRM comercial — Motor observável de acompanhamento

Data 27/10/2026. Repositório `railanzera-cloud/luciane-oliveira-doces-site`, Supabase comercial `edqiwvccmboyayojvuea`. Branch `feature/crm-motor-automacao-observavel-20261027` baseada no HEAD integrado `c4a76f3c139c1092f1d32023f9a4970399783572`.

## Problema e solução
O CRM já capta mensagens pelo Tintim, identifica fatias, agenda o follow-up 45 minutos depois da resposta da atendente e cancela ao receber outra mensagem. Isso **não é prova de janela Meta, consentimento ou capacidade de disparo**.

Criado motor backend **somente observável** com duas tabelas privadas e RLS:
- `crm_automation_queue`: um registro por followup real, chave idempotente, tipo (`scheduled`, `blocked`, `review_required`, `finished`), horário e motivos técnicos, sem conteúdo de conversa nem telefone.
- `crm_automation_monitor`: último scan, totais de itens monitorados.
- `crm_automation_evaluate_pending()`: execução técnica apenas `service_role` ou owner `postgres` (cron). Examina até 500 followups nos últimos 30 dias. Não cria envios, não marca followup enviado, não altera pagamento nem pedido, não muda estado da conversa. Lock advisory evita concorrência entre scans. UPSET idempotente sobre `follow_up_id`.
- Qualquer follow-up vencido sem os requisitos recebe motivos objetivos: `consent_unverified`, `provider_timestamp_unverified`, `outside_verified_window`, `business_reply_unverified`, `possible_purchase`, `customer_opted_out`, `sender_disabled`, `provider_not_certified`. Último é **hard gate**, independente de configuração, até homologação do provedor.
- `crm_automation_operational_report()` e `crm_automation_queue_items()`: leitura apenas por `crm_require_staff()`, nenhuma PII extra no resumo. Painel informa última avaliação, quantos bloqueados/agendados e motivo por cliente.

## Evidência e limites
A simulação de produção em transação BEGIN/ROLLBACK classificou 4 vencidos bloqueados, 2 futuros agendados e 76 finalizados, sem saída de rede ou mudança persistente. O banco tem zero timestamp original confirmado por Tintim: 198 eventos conhecidos, todos `webhook_received`; zero eventos de envio/entrada Meta. Sem opt-in comprovação; `automatic_sends_enabled=false`. Portanto envio automático real continua estritamente bloqueado.

## Motor recorrente
A extensão `pg_cron` está disponível (v1.6.4) mas não instalada. Após migrar e validar banco e CI, instalar extensão e agendar auditoria **apenas de observação**, nome de job `lod-crm-audit-only-5min`, comando SQL `select public.crm_automation_evaluate_pending();`, `*/5 * * * *`. Registrar/verificar cron.job e cron.job_run_details; nenhum webhook outbound nem POST Meta será executado. Se extensão/scheduler indisponível, comunicar impedimento e manter só a consulta manual.

## Não alterar
Não tocar em `main`, checkout Pix Mercado Pago, orders, QZ Tray/impressão, campanhas, Meta Pixel/Tintim, catálogo/IDs/imagens, Luciane Gestão `cztafxixnfpliaygniuj` ou outros projetos. Back-end refatoração apenas SQL aditivo e UI de observabilidade. Publicação Cloudflare via ZIP integrado feito a partir do mesmo commit testado, preferencialmente preview.

## Pendências estruturais reais
- Consentimento para abordagem comercial válido, com evidência; registro atual não significa aceite.
- Provedor oficial Meta/WhatsApp compatível com **o mesmo número** e Coexistence do Tintim; jamais reconectar via QR sem confirmação.
- Timestamp de entrada confiável (provedor/Meta), janela de 24h e template aprovado fora da janela.
- Credenciais WABA/phone number ID/BSP em secrets, verificação de assinatura dos webhooks e receipt de envio/entrega.
- Transação/idempotência real de outbox e rechecagem atômica de elegibilidade **imediatamente antes de qualquer POST**.
- Compra por WhatsApp sem telefone persistente pode não cruzar automaticamente; fail closed em caso de dúvida.

Não afirmar automação de disparo concluída até que tudo acima seja comprovado.
## Aplicação efetiva em produção (27/10/2026)
- Migração `crm_automation_observer_20261027` aplicada ao Supabase comercial depois da CI `40501774467`: 602/602 testes, build, TypeScript, ZIP corretos, SHA do código `9e5796a35b209da6ee1a598dfb97d8b076ca2086`.
- Extensão `pg_cron` v1.6.4 instalada, job ativo `lod-crm-audit-only-5min` ID 1, comando exato `select public.crm_automation_evaluate_pending();`, periodicidade 5 minutos.
- Auditoria de produção: 82 registros observados (4 bloqueados, 2 agendados, 76 finalizados). 6 follow-ups reais pendentes não foram alterados, 0 consentimentos com evidência, 0 eventos oficiais Meta, `automatic_sends_enabled=false`.
- Migração reexecutável `20261027008000_crm_automation_cron_audit_only.sql` mantém agendamento consistente e foi registrada no repositório; não é mecanismo de disparo.
- Antes de alegar que roda autonomamente, verificar `cron.job_run_details` após horário previsto. `cron.job.active=true` sozinho não comprova execução.
