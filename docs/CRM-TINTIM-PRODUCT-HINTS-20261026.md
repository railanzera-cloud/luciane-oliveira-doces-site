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

## Checkpoint homologado e implantação parcial em produção
- Commit integrado de código `de36504ad2b3153f9605a9d0aef55f9633eee5f2` (descende de `ba66623a`).
- Workflow GitHub `40438411314`: build OK, TypeScript OK, **585 testes passados, 0 falhas**. SHA256 artefato gerado pelo CI `3b88902641ffc1bf0e849af992da9d6f7327c4b29bce34a9bde46768e4609f52`. É artefato GitHub, **não** prova deploy Cloudflare.
- Banco Supabase comercial: migration aplicada `crm_tintim_product_hints_20261026`, versão `20261027022743`.
- Edge Function `tintim-webhook` **v11 ACTIVE**, SHA256 `802ac0c40be2793f4640844e6080c353b4ac231501be3ad700fb160c367af8c3`; mesmo endpoint e mesma autenticação; rotinas de pedidos e eventos CRM anteriores preservadas.
- Teste SQL BEGIN/ROLLBACK passou para inserção de produto por evento inbound real verificado, idempotência, retirada da dica, bloqueio de fingerprint inexistente e role authenticated sem permissão. **Nenhum dado sintético persistiu.**
- Conferência após deploy: 180 mensagens de Tintim registradas, 54 clientes, 4 follow-ups pendentes, 0 dicas de produto detectadas, 0 interesse `staff_confirmed`, `automatic_sends_enabled=false`. Ainda NÃO há prova ponta a ponta de classificação de novo texto real posterior à v11; aguardar um evento genuíno sem retrabalho antigo.
- Código atualizado do painel e rascunhos **está somente no GitHub**. Não publicar Cloudflare sem verificar deployment/HEAD correspondente e sem homologação específica. Na loja live ainda não se pode afirmar que aparecem as dicas personalizadas.
- Limites: classificador é determinístico e conservador; mensagens de áudio e intenções ambíguas não são interpretadas; a fila de 45 minutos continua independente. Um sinal derivado NÃO autoriza envio. A conexão Coexistence continua no Tintim, sem API oficial de envio validada. 
