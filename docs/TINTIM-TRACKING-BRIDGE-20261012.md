# Ponte Tintim -> Supabase — 12/10/2026

Fase 1 implementada no projeto comercial `edqiwvccmboyayojvuea`.

## Ambiente remoto
- Migração aplicada: `tintim_tracking_bridge_20261012`.
- Tabelas novas: `tintim_webhook_receipts`, `tintim_conversations`, `tintim_order_links` (vínculos ainda não automáticos).
- Function independente publicada: `tintim-webhook`, versão 1, protegida por token de URL cujo SHA-256 está no código (não armazenar token em repositório).
- RLS habilitada. RPC `record_tintim_webhook_event` executável apenas por `service_role`.
- Quatro testes locais do parser passaram e chamada SQL idempotente foi validada com rollback.
- Tintim ainda não foi conectado. Não ativar envios de mensagens nesta fase.

## O que não foi alterado
- Sem alterações em `orders`, pagamentos, checkout, Meta Pixel, CAPI, gatilho de Purchase, campanhas e webhooks do Mercado Pago.
- Evitar sobrescrever qualquer função existente, especialmente `create-whatsapp-order`: a última versão publicada não corresponde necessariamente à referência de promoção no pacote ZIP do Work.

## Próximo ciclo
1. Validar um evento real do Tintim com dados de teste e ajustar parser conforme o formato efetivo.
2. Reconciliar o checkpoint comercial `126b5a41` (não publicado no GitHub) antes de alterar arquivos já existentes.
3. Implementar histórico de múltiplas interações com primeiro toque, visita atual, data/hora, IDs e campanha histórica sem sobrescrita.
4. Criar visualização detalhada no painel e vínculos auditáveis pedido/lead, sem presumir venda ou mudança de pagamento.
5. Não duplicar Purchase; a confirmação atual permanece sendo feita no Tintim.

Arquivos de implementação estão no ZIP de entrega gerado nesta etapa; este documento no GitHub não substitui o pacote do código.
