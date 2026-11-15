-- CRM: read-only metadata for staff to distinguish actual Meta webhooks
-- from webhook receive-time Tintim signals. Does not read message bodies.
-- No changes to delivery, purchase, consent, follow-ups, or stock.
CREATE OR REPLACE FUNCTION public.crm_list_conversation_evidence()
RETURNS TABLE(
  conversation_id uuid,
  meta_last_inbound_at timestamptz,
  tintim_last_inbound_at timestamptz,
  tintim_time_basis text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
  PERFORM public.crm_require_staff();

  RETURN QUERY
  WITH meta_evidence AS (
    SELECT e.conversation_id, max(e.occurred_at) AS last_at
    FROM public.crm_whatsapp_message_events e
    WHERE e.provider='meta' AND e.direction='inbound'
      AND e.conversation_id IS NOT NULL
    GROUP BY e.conversation_id
  ),
  tintim_evidence AS (
    SELECT DISTINCT ON (e.conversation_id)
      e.conversation_id, e.occurred_at AS last_at, e.time_basis
    FROM public.crm_tintim_message_events e
    WHERE e.direction='inbound' AND e.conversation_id IS NOT NULL
    ORDER BY e.conversation_id, e.occurred_at DESC, e.id DESC
  )
  SELECT c.id, m.last_at, t.last_at, t.time_basis
  FROM public.crm_conversations c
  LEFT JOIN meta_evidence m ON m.conversation_id=c.id
  LEFT JOIN tintim_evidence t ON t.conversation_id=c.id
  WHERE m.last_at IS NOT NULL OR t.last_at IS NOT NULL
  ORDER BY c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_list_conversation_evidence()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_list_conversation_evidence()
  TO authenticated;
