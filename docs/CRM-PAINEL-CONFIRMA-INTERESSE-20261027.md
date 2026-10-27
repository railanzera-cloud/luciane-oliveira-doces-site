# CRM comercial — Painel de interesse confirmado e rascunhos antes do vencimento

**Data:** 27/10/2026. **Projeto:** Luciane Oliveira Doces comercial, `railanzera-cloud/luciane-oliveira-doces-site`; Supabase `edqiwvccmboyayojvuea`.
**Base:** `feature/crm-sabores-mencionados-webhook-20261026` @ `d47c95b30fa91c4872c82a26cbef26259fc9c17c`.
**Branch:** `feature/crm-painel-confirma-interesse-20261027`.
Não confundir com Luciane Gestão, Boutique 4.6, Results nem projetos de impressão e Mercado Pago.

## Realidade já homologada
- Fluxo Prestígio cliente inbound às 07h51 → Luciane outbound às 07h54 → follow-up 08h39 → cliente inbound 07h56, follow-up CANCELADO. SQL de produção: `resolution_reason=tintim_customer_replied`. Nenhuma mensagem enviada pela plataforma.
- `tintim-webhook` v11 recebe mensagens e grava apenas IDs de sabores. Prioridade na copy: interesse confirmado pela equipe > menção textual inequívoca > referência do anúncio > genérica. Nenhuma mensagem é salva nem assunto inferido de áudio.
- Auditoria inicial: 187 eventos de mensagens, 1 menção de Prestígio, 36 cancelamentos por resposta, 4 follow-ups pendentes, `automatic_sends_enabled=false`.

## Nova melhoria
- Antes, o campo "Produto de interesse (confirmado pela Luciane)" era salvo indiretamente por `crm_record_action(p_action='waiting')`, provocando criação/reagendamento de lembrete. Correção separa confirmação da equipe de agendamento.
- Migração `20261027006000_crm_confirm_interest.sql`: `crm_confirm_interest(conversation_id,interest)`, ACL `crm_require_staff`, texto 2–80 caracteres, status ativo obrigatório, row lock, idempotência, interest_basis=`staff_confirmed`. Sem mexer em followups, pedidos, pagamentos ou enviar mensagens.
- UI: botão independente **Salvar produto confirmado**; apenas informação salva entra no rascunho. Texto em edição não é confundido com confirmação. Cartões compactos exibem origem do sabor e a busca encontra menções. Mensagem sugerida aparece ao agendar follow-up, antes de vencer, mas link manual WhatsApp só aparece ao vencer com consentimento e sem possível compra.
- Orientação ao staff agora distingue operação automática de lembretes de ações de correção manual.
- Migração validada em SQL transação `BEGIN ... ROLLBACK` com conta autorizada, verificação de repetição, proteção contra acesso não autorizado e ausência de criação de lembrete. Nenhuma alteração de teste persistente.
- **Envios ainda bloqueados por CHECK** `automatic_sends_enabled=false`; sem integração oficial de envio homologada. A nova RPC não concede nenhum tipo de autorização automática.

## Implantação
- CI completo: build, TypeScript, testes Node, ZIP Cloudflare do mesmo SHA. Antes de qualquer publicação, validar commit e origem do site; não presumir que uma branch foi publicada no Cloudflare.
- SQL aditivo (aplicar após CI) não modifica CRM existente, corrige exclusivamente confirmação de sabor. Não fazer merge `main`.
- **Painel no Cloudflare não foi modificado nesta etapa**; disponibilizar artefato testado do mesmo commit para publicação autorizada.
- Outras pendências: confirmar API oficial de envio compatível com a Coexistence atual sem remover Tintim, política de consentimento, timestamps originais de mensagens, compras pagas por telefone, confirmação de entrega/ids e tratamento de falhas.
