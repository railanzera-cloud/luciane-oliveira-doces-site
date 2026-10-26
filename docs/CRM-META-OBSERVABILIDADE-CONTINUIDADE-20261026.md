# CRM / Meta — Continuidade operacional da segunda etapa — 26/10/2026

## Identidade e base
Projeto: railanzera-cloud/luciane-oliveira-doces-site, Supabase edqiwvccmboyayojvuea.
Branch: feature/crm-followups-assistidos-20261026.
Origem: commit 596170323cf02c5fd8b3a15cb6d020f3046c2a8a, derivado de ops/chocolate-morango-pre-reserva-pausada-20261026.
Não alterar main, não publicar Cloudflare sem confirmação da versão de produção.
As branches de Mercado Pago e do agente Windows divergem da linha comercial principal e não são alvo deste trabalho.

## O que existia no começo da retomada
- CRM migration crm_followups_assistidos_20261026 já aplicada separadamente no Supabase.
- Tabelas crm_staff_access, crm_customers, crm_conversations, crm_follow_ups, crm_events.
- Dois acessos específicos no CRM autorizados (e-mails mascarados de gestor e Luciane, identidade privada). Sem contatos/ligações/followups ainda.
- Código front-end da aba Clientes no GitHub; deploy Cloudflare não confirmado.
- CI do commit anterior: 543/543 testes, TS e build, ZIP verificado.

## Evolução desta etapa
1. RPC crm_sync_recent_tintim é chamada na abertura e atualização do painel. Examina janela de até 72h, importa contatos para CRM uma única vez e nunca agenda follow-up nem marca aceite. Ignora estágio explicitamente Comprou. Não cria trigger no webhook Tintim.
2. Aba Clientes inclui filtro Novos; reconsulta automaticamente a cada minuto visível e quando a aba retorna ao primeiro plano.
3. crm_whatsapp_message_events guarda somente ID, telefone, direção, timestamp e vínculo. Não guarda corpo nem mídia.
4. crm_record_meta_message aceita somente credencial service_role (chamada por Edge Function autenticada); mensagens inbound cancelam follow-ups posteriores e registros de echo outbound podem agendar 45 minutos após resposta humana se houve mensagem recebida previamente.
5. crm_automation_settings mantém automatic_sends_enabled=false de forma estrutural. Nenhum job cron, API de envio, mensagem de marketing, pagamento, Pixel ou CAPI é alterado.
6. crm-whatsapp-webhook: código de endpoint Meta para GET de verificação e POST HMAC SHA-256, filtros por WABA e Phone Number ID, parser mínimo, dedupe por ID. **Não colocar em operação antes de validar eventos e permissões da conta**.

## Bloqueios de ativação da observabilidade oficial
- Confirmar empresa Meta, WABA e telefone realmente elegíveis.
- Coexistence exige suporte real; sms_message_echoes [sic: nome correto smb_message_echoes] deve ser testado em mensagem real e não inferido apenas de documentação.
- Provisionar META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_BUSINESS_ID em ambiente protegido, sem logs nem GitHub.
- Confirmar políticas, janelas de 24h, consentimento e preço oficial antes de qualquer envio.
- Publicar Edge Function e configurar Meta Webhook somente após validação da conta; nenhuma ativação foi feita aqui.

## Segurança e operação
- Os contatos Tintim existentes não demonstram opt-in comercial: consent_status permanece unknown.
- Uma conversa nova via Meta nao significa venda nem confirma interesse em produto.
- Nenhuma mensagem proativa é enviada por essa arquitetura. O WhatsApp manual continua exigindo ação humana e consentimento.
- Deduplicar com message_id e direção; fluxo tolera reentregas. Avaliar chegada fora de ordem com testes reais.
- Cancelar followups quando convertido, inclusive múltiplos atendimentos do mesmo telefone.
- Contrastar sinais de Tintim (unverified) com pedidos confirmados; não fabricar receita.
- Preserve pedidos, estoque, Cloudflare, QZ Tray, pagamentos, Meta Pixel, Tintim e demais bancos.
- Homologação necessária no Safari/iPhone, autenticação, painel, conteúdo do ZIP e webhooks reais.

## Próximo checkpoint seguro
Validar CI, SQL rollback e permissions; aplicar apenas migração aditiva revisada caso aprovada; deploy não deve assumir que HEAD GitHub = produção.
Depois testar mensagens reais em sandbox/Meta sem enviar marketing e sem configurar número existente sem garantia de coexistence.
