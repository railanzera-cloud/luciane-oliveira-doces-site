# CRM — Identificação prudente de sabores mencionados (26/10/2026)

## Projeto e base correta
Apenas Luciane Oliveira Doces comercial: `railanzera-cloud/luciane-oliveira-doces-site`, Supabase comercial `edqiwvccmboyayojvuea`, fuso `America/Belem`.
Base integrada `feature/crm-fatia-rascunhos-personalizados-20261026` @ `ba66623a0198f583dc26c8ded3ffe25e6a8f2ac6`. Nova branch `feature/crm-sabores-mencionados-webhook-20261026`.
Não mexer Luciane Gestão, operações de pedidos, pagamentos, disponibilidades, impressora, CAPI ou credenciais.

## Funcionalidade e segurança
- O Tintim em produção emite `message_create` com corpo `message` string, `from_me` topo e `lead.phone`. Depois de registrar o evento verificado pelo webhook já autenticado, detectamos **somente menções inequívocas** de sabores em mensagens de entrada (`from_me=false`).
- `extractTintimProductMention` é síncrono e local; corpo de mensagem NUNCA enviado para banco nem logado. Apenas `product_id` canônico, `action` e SHA256 fingerprint de evento previamente verificado chegam a RPC.
- Rejeitar: morango genérico, vários sabores na mesma mensagem, URLs, anexos, mensagens da atendente, nomes sem contexto de compra/pergunta. Negação explícita pode limpar dica anterior do mesmo produto.
- Tabela privada `crm_tintim_product_hints` apenas `conversation_id,product_id,basis,message_event_id,last_seen_at` e `updated_at`, com RLS e sem acesso direto anon/authenticated.
- RPC `crm_record_tintim_product_mention` exige service_role + fingerprint pré-existente inbound vinculado; ignora eventos de observação sem conversa. `crm_list_tintim_product_hints` exige ACL crm_staff_access.
- Banco **não preenche automaticamente** `crm_conversations.interest_label`: esse campo permanece reservado para interesse validado pela atendente. Sinal não presume compra, disponibilidade, consentimento ou faturamento.
- Prioridade do rascunho no painel: (1) interesse confirmado pela Luciane, (2) menção inequívoca de cliente, (3) anúncio inequívoco, (4) texto genérico. A sugestão nunca dispara WhatsApp e pode ser mostrada para revisão, mesmo quando envio bloqueado. Link wa.me continua restrito a consentimento registrado e ausência de sinal de compra.
- Não reprocessar mensagens antigas como novas; aplica somente aos próximos eventos após deploy. Continua válido o agendamento/cancelamento dos lembretes baseados em novas mensagens.
- Preservar assinatura da autenticação no webhook, reconciliação de pedido do site e idempotência. Mensagens que trazem padrão comprovado de pedido são excluídas da classificação comercial.
- Modo de disparo continua DESATIVADO e protegido por CHECK; não há provedor de envio confirmado para a WABA Coexistence da Luciane.
- Se API de envio não for autorizada pelo Tintim/provedor, não contornar via automação de interface do iPhone ou sessões não oficiais.

## Implantação
Executar SQL BEGIN/ROLLBACK para os controles de inserção/revisão/cancelamento antes da migração. CI completo build/testes. Só depois migration privada e deploy da Edge Function `tintim-webhook`, com mesma URL/chave.
**Não publicar Cloudflare sem homologação específica**: componentes/admin-crm-panel.tsx e lib/crm-follow-up.ts ficam no GitHub até revisão de deploy. Não alterar main.
