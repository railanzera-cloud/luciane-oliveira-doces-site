# CRM — Proteção contra follow-up após sinal de compra — 26/10/2026

Projeto: somente Luciane Oliveira Doces, repositório railanzera-cloud/luciane-oliveira-doces-site.
Supabase comercial exclusivo edqiwvccmboyayojvuea; fuso America/Belem.
Branch: feature/crm-sinais-compra-20261026.
Base verificada: feature/crm-triagem-mobile-20261026 @ 25a353f9a2b882d17849d2edd61d23d9fcd549ff.
Não misturar Luciane Gestão, Boutique, Mercado Pago, cozinha, QZ, Pix, Tintim webhook e main.

## Evidência concreta
Gravação enviada da nova publicação no iPhone confirma aba Clientes, busca, cartões recolhidos, expansão, quatro filtros e estados. Não comprova que o Cloudflare está no commit exato; comprova a aparência do novo front-end.
Supabase no momento da conferência: 45 contatos; 44 in_progress, 1 waiting_customer; 1 follow-up pendente, zero vencidos; zero eventos oficiais WhatsApp; envio automático DESLIGADO.
10 clientes com nome genérico porque não há nome melhor no Tintim. 28 contatos com origem Meta Ads. Há um estágio Tintim 'Comprou' associado a um contato no CRM; isso NÃO confirma pagamento, mas justifica segurar follow-up comercial até revisão manual.

## Mudanças nesta branch
- RPC crm_list_tintim_signals(): restrita por crm_require_staff, retorna etapa no Tintim, anúncio associado, campanha e último sinal. Não retorna texto privado de conversa.
- Trigger crm_purchase_signal_before_followup: impede agendar/adiar lembrete pending quando o lead relacionado tem estágio externo Comprou, Convertido, Vendido ou Venda Realizada.
- RPC crm_hold_tintim_purchase_signals(): cancela lembretes pendentes que adquiriram posteriormente esse sinal, com auditoria, sem mudar status de venda ou dados financeiros.
- UI exibe aviso 'Possível compra' e impede agendamento imediato; campo de origem do anúncio é contexto, não prova de produto de interesse.
- O último sinal do Tintim não é prova de recebimento de mensagem e é apresentado exatamente assim.
- Triagem ordenada por último sinal do Tintim, preservando a natureza provisória da descoberta.
- Nenhum disparo Meta API, campanha, rotina cron ou gasto de envio foi habilitado.
- Não existe migração automática de contatos para vendas pagas. Não atualizar paid_at, status de orders, Purchase ou Tintim.

## Implantação
1. Auditar CI do commit e executar SQL em transação com ROLLBACK. Validar trigger com cenário sintético de etapa Comprou.
2. Aplicar migration aditiva 20261026231500_crm_tintim_purchase_signal_guard.sql somente no projeto comercial.
3. Conferir privilégios de RPC, RLS existente, nenhuma alteração em pedidos, nenhum disparo, e verificar evento real de teste reversível.
4. Gerar ZIP Cloudflare do MESMO SHA validado, sem publicar por conta própria.
5. Homologar no Safari/iPhone ao publicar.
6. Depois: conferir configuração Meta WABA, elegibilidade de coexistência com WhatsApp Business, número, webhooks oficiais inbound/echo com assinatura e custos de mensagens.

Os controles de consentimento, opt-out, confirmação de compra e cancelamento por resposta ainda são necessários. A proteção de estágio externo é uma camada ADICIONAL, não prova de pagamento.
