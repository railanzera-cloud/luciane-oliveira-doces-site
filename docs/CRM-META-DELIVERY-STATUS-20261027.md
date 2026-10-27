# CRM comercial — Comprovantes oficiais de entrega WhatsApp

27/10/2026. Repositório: railanzera-cloud/luciane-oliveira-doces-site. Base segura: feature/crm-outbox-envio-oficial-preparo-20261027 @ e166f040bbdafa65caa3e399b981102201227162. Nova branch: feature/crm-meta-status-webhook-20261027. Supabase comercial exclusivo: edqiwvccmboyayojvuea.

## Identificações do número na Meta
Usuário apresentou captura da WABA real "Luciane Oliveira" e do Phone Number ID `1237877910737444`. WhatsApp Manager informou "Conta restrita: verifique sua empresa antes de começar a enviar mensagens". Verificação empresarial estava em análise. **O ID não é um access token e não concede permissão de envio.** O usuário autorizou continuar as implementações, não mudar a Coexistence. Tintim confirmou que recebe eventos de ferramentas integradas pela API oficial, mas não fornece o envio.

## O que foi feito
- Migração `20261027195000_crm_meta_delivery_status.sql`: duas tabelas privadas `crm_delivery_attempts` (PK por follow-up, ID de mensagem Meta UNIQUE quando futuro worker de envio oficialmente confirmado registrar aceite) e `crm_delivery_status_events` (idempotência por wamid+status+timestamp). RLS ativado e sem acesso direto do navegador.
- RPC `crm_record_meta_delivery_status`: acesso estrito service_role, ignora IDs desconhecidos, registra somente status e horário assinados, não cria vendas ou libera disparos. Atualizações **monotônicas** (read > delivered > sent > accepted). Falha não derruba delivered/read. Histórico duplicado é reconhecido, ordem de chegada não importa. Falha final após sent só se não houve entrega.
- RPC staff `crm_delivery_receipt_summary`: contagem agregada por status, nunca telefone, corpo da conversa, nem mídia.
- Nova biblioteca `status-core.mjs` extrai statuses `sent`,`delivered`,`read`,`failed` apenas da WABA e phone ID esperados; sem PII.
- `crm-whatsapp-webhook/index.ts` v2 reutiliza HMAC-SHA256 e validação de WABA/Phone; chama RPC apenas com service_role. Rejeita HTTP quando gravar status falha para permitir retry oficial. Não muda a observação de mensagens inbound, que já existia.
- A implantação do webhook em Supabase não vincula a Meta automaticamente: nenhuma assinatura nova, token ou API outbound, nenhum envio. Serviço só poderá processar eventos quando `META_APP_SECRET`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_BUSINESS_ID`, `META_WEBHOOK_VERIFY_TOKEN` forem configurados e a Meta indicar o callback; fazer isso SOMENTE quando autorização do canal for comprovada.

## Verificações
Testar SQL em transação BEGIN/ROLLBACK: única tentativa sintética ligada a follow-up existente, simular read/delivered/failed fora de ordem, repetir, rejeitar wamid sem tentativa conhecida e role não autorizada. Nenhum dado fictício persistido; nenhuma mensagem foi enviada.
GitHub Actions deve passar build, TypeScript, testes node, ZIP Cloudflare. Não é necessário upload Cloudflare para migração/webhook; painel atual permanece intacto.
Não mudar pedidos, pagamentos, Pix, impressora QZ Tray, Meta Ads/Tintim, catálogo, UI da vitrine, fontes de rastreamento, main antiga ou Luciane Gestão separada.

## Pendências antes de mensagem de teste real
1. Meta aprovar verificação/restrição da WABA e permitir acesso à Cloud API do número comercial mantendo WhatsApp Business app e Tintim.
2. Identificar app/BSP com permissões `whatsapp_business_messaging` + `whatsapp_business_management`; token servidor seguro sob controle autorizado, configuração WABA/phone ID real. Nunca solicitar token no chat.
3. Validar webhook assinado e status real usando um contato de teste, correlacionar resposta de aceitação `wamid` com tentativa única e confirmar sent/delivered. Se callback pertence a outro aplicativo, não substituí-lo sem coordenação.
4. Implementar claim atômico de envio; checar follow-up, consentimento comprovado, opt-out, serviço 24h, compra, cancelamento e canal no instante do envio. Modelo aprovado fora da janela; nem 45 minutos nem origem de Ads implicam opt-in.
5. Não confundir entrega com compra, nem resposta HTTP 200 com entrega; bloquear retry automático de falhas ambíguas.
