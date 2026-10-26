# Continuidade — Tintim → CRM em tempo real (26/10/2026)

Projeto comercial exclusivo Luciane Oliveira Doces: `railanzera-cloud/luciane-oliveira-doces-site`, Supabase `edqiwvccmboyayojvuea`, fuso `America/Belem`.
Branch desta melhoria: `feature/crm-tintim-live-sync-20261026`, base validada: `feature/crm-sinais-compra-20261026` @ `71befe97868b3d0a839dd9ec76ab1983b536b4f4`.
Não tocar Luciane Gestão, Boutique, Cloudflare, pedidos, pagamentos, impressão, Meta, Pixel/CAPI ou main.

## Estado comprovado antes
- Screenshot Meta Business Settings: WhatsApp account em status Conectado, limite mostrado de 250 clientes / 24h; não prova Cloud API/Coexistence, app desenvolvedor configurado ou webhook inscrito.
- Edge Function `crm-whatsapp-webhook` já instalada no projeto comercial, mas sem eventos reais ainda; credenciais Meta não conferidas/não disponibilizadas.
- Contatos no CRM existentes: 45, novos sinais Tintim inseridos apenas no refresh do painel.
- Envio por API permanentemente desabilitado por CHECK no banco.
- Pagamentos/vendas e whatsapp_events do CRM não são a mesma fonte.
- Nos 429 registros de orders vistos, apenas 4 tinham customer_phone preenchido. Não usar compra automática baseada em suposição; nenhuma estratégia de venda considera todos os clientes identificáveis por telefone.

## Melhoria implementada
Trigger `crm_tintim_live_sync` na tabela `tintim_conversations` adiciona à base CRM novos leads válidos dos últimos 7 dias assim que chegam via webhook Tintim, sem abrir painel. Repetições não geram oportunidades duplicadas para o mesmo registro do Tintim. Atualiza nome genérico quando o Tintim fornece um nome útil. Respeita opt-out, consentimento e dados comerciais existentes. Não agenda nem envia WhatsApp.
Se estágio do Tintim indicar 'Comprou' / 'Convertido' / 'Vendido' / 'Venda Realizada', cancela lembretes pendentes do mesmo telefone, com evento de auditoria. **Não** marca pedido como pago e **não** registra venda, não altera Tintim, não apaga conversa.
Falhas internas do CRM geram aviso no log do PostgreSQL sem bloquear a chegada de novos sinais ao Tintim; o sync de leitura da aba Clientes continua sendo fallback.
Função trigger revogada de PUBLIC, anon e authenticated. SECURITY DEFINER com search_path vazio.

## Verificação / rollback
- SQL transacional com fake lead, atualização repetida e etapa Comprou confirmado e depois ROLLBACK (sem registros de teste).
- CI testa TypeScript, build e suíte do repositório. Conferir commit SHA no GitHub Actions ao aplicar.
- Migration aditiva exclusiva para Supabase: `20261026235500_crm_tintim_live_sync.sql`.
- NENHUMA publicação Cloudflare nova necessária para essa mudança.
- Reverter, se indispensável: DROP TRIGGER crm_tintim_live_sync ON public.tintim_conversations; DROP FUNCTION public.crm_ingest_tintim_on_change(); após revisão da operação e das dependências. Isso não desfaz contatos legítimos importados, mas interrompe novas importações.

## Dependência externa obrigatória
- Vincular Meta Developer App/WhatsApp Cloud API com WABA, phone_number_id, webhook subscriptions e segredo de app no Supabase sem expor tokens.
- Validar Coexistence do MESMO número no app Business, pois 'Conectado' em Business Settings não prova que ecos `smb_message_echoes` estão habilitados.
- Observar mensagem real de inbound e outbound e cancelamento sem mensagens erradas antes de permitir qualquer dispatch.
- Templates aprovados, opt-in, janela de 24h, limites/custos e compra confirmada precisam de validação.
