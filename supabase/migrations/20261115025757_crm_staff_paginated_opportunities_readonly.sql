-- Applied to commercial Supabase edqiwvccmboyayojvuea on 2026-11-15.
-- Mirrors migration 20261115025757. Staff-only read, no messaging.
CREATE OR REPLACE FUNCTION public.crm_list_opportunities_page(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 250
)
RETURNS TABLE(
  conversation_id uuid, customer_name text, phone_e164 text,
  consent_status text, commercial_opt_out boolean, interest_label text,
  status text, source_label text, last_inbound_at timestamptz,
  last_outbound_at timestamptz, follow_up_id uuid,
  follow_up_due_at timestamptz, follow_up_status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $crm$
BEGIN
  PERFORM public.crm_require_staff();
  RETURN QUERY
    SELECT c.id, cu.display_name, cu.phone_e164, cu.consent_status,
      cu.commercial_opt_out, c.interest_label, c.status, c.source_label,
      c.last_inbound_at, c.last_outbound_at,
      f.id, f.due_at, f.status, c.created_at
    FROM public.crm_conversations c
    JOIN public.crm_customers cu ON cu.id = c.customer_id
    LEFT JOIN LATERAL (
      SELECT fu.id, fu.due_at, fu.status
      FROM public.crm_follow_ups fu
      WHERE fu.conversation_id = c.id
      ORDER BY fu.created_at DESC, fu.id DESC
      LIMIT 1
    ) f ON TRUE
    ORDER BY
      CASE WHEN f.status='pending' AND f.due_at<=now() THEN 0
           WHEN f.status='pending' THEN 1 ELSE 2 END,
      coalesce(f.due_at,c.updated_at) DESC,
      c.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit,250),1),250)
    OFFSET LEAST(GREATEST(COALESCE(p_offset,0),0),50000);
END;
$crm$;

REVOKE ALL ON FUNCTION public.crm_list_opportunities_page(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_list_opportunities_page(integer,integer) TO authenticated;
COMMENT ON FUNCTION public.crm_list_opportunities_page(integer,integer)
  IS 'CRM staff-only stable paginated read. No sending, side effects or consent mutation.';
