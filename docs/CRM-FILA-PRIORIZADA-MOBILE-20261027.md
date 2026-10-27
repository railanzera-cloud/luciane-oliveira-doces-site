# CRM — Fila priorizada e refinamento mobile (27/10/2026)

Projeto comercial Luciane Oliveira Doces. Repositório `railanzera-cloud/luciane-oliveira-doces-site`, Supabase comercial `edqiwvccmboyayojvuea`. Somente este projeto; preservar sistemas Luciane Gestão/Boutique e pagamentos/impressão/estoque.
Branch `feature/crm-fila-priorizada-mobile-20261027`, construída sobre branch `feature/crm-painel-confirma-interesse-20261027`, HEAD verificado `866d3666ac970aca1bb0bb05bd903c563a2d2df3`.
Nunca substituir base integrada pela main antiga `26730be`.

## Diagnóstico de produção
- 53 conversas CRM; 5 follow-ups pendentes; 4 vencidos; 1 referência de Prestígio confirmada por nova mensagem; 0 clientes com consentimento comercial comprovado.
- API automática continua desligada. Os vencidos são casos sem consentimento, não oportunidades autorizadas para enviar. A classificação da fila precisa deixar isso visível, sem cancelar lembretes antigos sem revisão.

## Mudanças de apresentação e fluxo
- Helper determinístico e puro `crmQueueBucket` separa `review_now`, `blocked_due`, `scheduled` e `other`. Somente o campo `consent_status='granted'` e ausência de opt-out/sinal de possível compra permitem `review_now`, que ainda significa **conferência manual**, nunca autorização da Cloud API/24h. Lembretes agendados ou cancelados jamais entram na fila vencida.
- Navegação CRM em cinco filtros: **Para agora**, **Revisar** (pendências vencidas sem autorização/compra/bloqueio), **Triagem**, **Acompanhar**, **Contatos Tintim**. Contadores legíveis, inclusive em mobile; o resumo comunica agendados/vencidos.
- Fila vazia “Para agora” aponta diretamente para “Revisar” quando há vencidos bloqueados, sem sugerir que possam receber envio.
- Cards vencidos bloqueados ficam recolhidos inicialmente, não uma rolagem gigante. Cartões continuam mostrando nomes, sufixos de telefone e indicação de produto; botão de expandir revela fonte do anúncio/menção/preferência.
- Em **Acompanhar**, um filtro optativo mostra contatos com indicação de produto (mesmo que origem seja apenas anúncio). O ordenamento dá prioridade a lembretes e produtos, sem apagar contatos sem contexto.
- Botões de correção manual foram recolhidos num `<details>` acessível. Não permitir “Registrar resposta manual 45 min” quando já houver lembrete automático pendente para o mesmo atendimento. Confirmar explicitamente antes de marcar uma mensagem como enviada fora do CRM.
- Preservados: nomes/IDs de produtos e catálogo, RLS/ACL, autorização comercial com evidência, opt-out, pré-checagem de envio, horários 45m, cancelamento por resposta, telefone, compra comprovada, Stripe/Mercado Pago, QZ Tray e Tintim.
- Somente UI/CSS e lógica pura TypeScript; **nenhuma migration de banco**, nenhuma alteração da Edge Function, nenhum webhook reprocessado e nenhum disparo.
- Empacotamento Cloudflare completo gerado em CI para a versão correspondente. Não assumir que ZIP é produção atual sem conferir publicação, fazer preview e testar /admin.
- Provedor de envio da mesma WABA/Coexistence ainda não confirmado; manter `automatic_sends_enabled=false`.
