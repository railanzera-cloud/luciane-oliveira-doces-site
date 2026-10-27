-- LOD commercial CRM: durable non-sending outbox staging.
-- Does NOT create an outbound WhatsApp channel or authorize any dispatch.
-- Existing followup, consent, storefront, Tintim and pg_cron semantics preserved.
BEGIN;
CREATE TABLE public.crm_delivery_outbox (
  follow_up_id uuid PRIMARY KEY REFERENCES public.crm_follow_ups(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id),
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'held'
    CHECK (state IN ('held','canceled')),
  blocker_codes text[] NOT NULL DEFAULT ARRAY['provider_not_certified']::text[],
  last_audited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_delivery_outbox_state_due_idx
  ON public.crm_delivery_outbox (state,due_at);
ALTER TABLE public.crm_delivery_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_delivery_outbox FROM PUBLIC,anon,authenticated;

-- This function is NOT a "claim for send". Nothing can leave "held" as a
-- dispatchable row in this schema. Background monitor can run unattended.
CREATE FUNCTION public.crm_delivery_prepare_holds()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE
 v_processed integer:=0;
 v_held integer:=0;
 v_canceled integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND
    (session_user <> 'postgres' OR auth.role() IS NOT NULL) THEN
   RAISE EXCEPTION 'crm_internal_only' USING ERRCODE='42501';
 END IF;
 IF NOT pg_try_advisory_xact_lock(72180310,20261028) THEN
   RETURN jsonb_build_object('skipped','already_running','sent',0);
 END IF;
 WITH tracked AS (
   SELECT f.id follow_up_id,f.conversation_id,f.due_at,
          f.status follow_up_status,
          coalesce(q.blockers,ARRAY[]::text[]) reason_codes
     FROM public.crm_follow_ups f
     LEFT JOIN public.crm_automation_queue q ON q.follow_up_id=f.id
    WHERE f.created_at > now()-interval '30 days'
    ORDER BY f.created_at DESC LIMIT 500
 ), staged AS (
   INSERT INTO public.crm_delivery_outbox AS o
     (follow_up_id,conversation_id,due_at,state,blocker_codes,last_audited_at)
   SELECT t.follow_up_id,t.conversation_id,t.due_at,
          CASE WHEN t.follow_up_status='pending'
                    THEN 'held' ELSE 'canceled' END,
          -- Source of truth is the observed queue; do not manufacture
          -- an eligible send state even after explicit consent is captured.
          CASE WHEN t.follow_up_status='pending'
            THEN ARRAY(SELECT DISTINCT code FROM unnest(
              t.reason_codes || ARRAY['provider_not_certified']::text[] ||
              CASE WHEN t.due_at>now() THEN ARRAY['not_due']::text[]
                   ELSE ARRAY[]::text[] END
            ) code ORDER BY code)
            ELSE ARRAY['followup_not_pending']::text[] END,
          now()
      FROM tracked t
   ON CONFLICT (follow_up_id) DO UPDATE SET
     conversation_id=excluded.conversation_id,
     due_at=excluded.due_at,
     state=excluded.state,
     blocker_codes=excluded.blocker_codes,
     last_audited_at=excluded.last_audited_at
   RETURNING state
 )
 SELECT count(*)::integer,
        count(*) FILTER (WHERE state='held')::integer,
        count(*) FILTER (WHERE state='canceled')::integer
   INTO v_processed,v_held,v_canceled
   FROM staged;
 RETURN jsonb_build_object('observed',v_processed,'held',v_held,
   'canceled',v_canceled,'sent',0,'delivery_mode','disabled');
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_delivery_prepare_holds() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_delivery_prepare_holds() TO service_role;

CREATE FUNCTION public.crm_delivery_readiness()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_result jsonb;
BEGIN
 PERFORM public.crm_require_staff();
 SELECT jsonb_build_object(
  'mode','disabled',
  'provider','unconfigured',
  'holds', count(*) FILTER (WHERE state='held'),
  'canceled',count(*) FILTER (WHERE state='canceled'),
  'sent',0,
  'last_audited_at',max(last_audited_at),
  'blockers', jsonb_build_array(
    'provider_access_unconfirmed','official_sender_not_configured',
    'opt_in_and_provider_timestamp_required'),
  'next_step','verify_whatsapp_business_account_and_phone_number_id'
 ) INTO v_result FROM public.crm_delivery_outbox;
 RETURN v_result;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_delivery_readiness() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_delivery_readiness() TO authenticated;
COMMIT;
