-- Corrige apenas o vínculo candidato do pedido de teste 1222, após
-- comprovar correspondência exata de fbclid, tintim_fbid, campanha, UTM e horário.
-- Não modifica pedidos, vendas, status de pagamento ou eventos Meta.
-- Os eventos originais permanecem preservados para auditoria.
UPDATE public.tintim_order_links AS link
SET conversation_id = verified.id
FROM public.orders AS ord,
     public.tintim_conversations AS provisional,
     public.tintim_conversations AS verified
WHERE link.order_uuid = ord.id
  AND link.conversation_id = provisional.id
  AND ord.order_number = 1222
  AND link.status = 'candidate'
  AND link.match_basis = 'order_reference'
  AND provisional.account_key = 'luciane-oliveira-doces'
  AND provisional.identity_basis = 'phone_provisional'
  AND verified.account_key = '2c956a42-229f-4d21-ade6-4442f8c048ed'
  AND verified.identity_basis = 'phone_provisional'
  AND verified.phone_digits = provisional.phone_digits
  AND verified.phone_digits ~ '^[0-9]{10,15}$'
  AND nullif(ord.fbclid,'') IS NOT NULL
  AND ord.fbclid = verified.visit_parameters->>'fbclid'
  AND nullif(ord.tintim_fbid,'') IS NOT NULL
  AND ord.tintim_fbid = verified.visit_parameters->>'tintim_fbid'
  AND nullif(ord.utm_campaign,'') IS NOT NULL
  AND ord.utm_campaign = verified.visit_parameters->>'utm_campaign'
  AND ord.utm_campaign = verified.campaign_name
  AND nullif(ord.utm_source,'') IS NOT NULL
  AND ord.utm_source = verified.visit_parameters->>'utm_source'
  AND verified.last_observed_at BETWEEN
      ord.created_at - interval '15 minutes' AND ord.created_at + interval '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM public.tintim_order_links other
    WHERE other.order_uuid=link.order_uuid
      AND other.conversation_id=verified.id
  )
  AND (
    SELECT count(*) FROM public.tintim_conversations candidate
    WHERE candidate.account_key=verified.account_key
      AND candidate.phone_digits=verified.phone_digits
      AND candidate.visit_parameters->>'fbclid'=ord.fbclid
      AND candidate.visit_parameters->>'tintim_fbid'=ord.tintim_fbid
  ) = 1;
