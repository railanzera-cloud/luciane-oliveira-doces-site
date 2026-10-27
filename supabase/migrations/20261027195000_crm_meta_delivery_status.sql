-- Commercial CRM: official WhatsApp delivery receipts (Meta Cloud API).
-- A provider's HTTP 200 + wamid is only ACCEPTED, not delivered.
-- No WhatsApp sending, no triggers, no migration of Tintim/Coexistence.
BEGIN;

CREATE TABLE public.crm_delivery_attempts (
  follow_up_id uuid PRIMARY KEY REFERENCES public.crm_follow_ups(id) ON DELETE CASCADE,
  provider_message_id text UNIQUE,
  state text NOT NULL DEFAULT 'prepared'
    CHECK (state IN ('prepared','accepted','sent','delivered','read','failed','unknown_outcome')),
  provider_status_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_delivery_attempt_message_format CHECK (
    provider_message_id IS NULL OR provider_message_id ~ '^wamid\.[A-Za-z0-9=+/_-]{3,250}$'
  ),
  CONSTRAINT crm_delivery_attempt_state_consistency CHECK(
    (provider_message_id IS NULL AND state IN ('prepared','unknown_outcome'))
    OR
    (provider_message_id IS NOT NULL AND state IN ('accepted','sent','delivered','read','failed'))
  )
);
ALTER TABLE public.crm_delivery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_delivery_attempts FROM PUBLIC,anon,authenticated;

CREATE TABLE public.crm_delivery_status_events (
  provider_message_id text NOT NULL REFERENCES public.crm_delivery_attempts(provider_message_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  provider_status text NOT NULL CHECK(provider_status IN ('sent','delivered','read','failed')),
  provider_occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_message_id,provider_status,provider_occurred_at)
);
CREATE INDEX crm_delivery_status_events_received_at_idx
  ON public.crm_delivery_status_events(received_at DESC);
ALTER TABLE public.crm_delivery_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_delivery_status_events FROM PUBLIC,anon,authenticated;

-- Called only by a signed Meta webhook through the backend service role.
-- Unknown message IDs are ignored; no lookup by phone or implicit new contact.
-- Order of arrival is NOT assumed to equal chronology. State is monotonic.
CREATE FUNCTION public.crm_record_meta_delivery_status(
 p_message_id text,
 p_status text,
 p_occurred_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_attempt public.crm_delivery_attempts%ROWTYPE;
 v_old_rank int;
 v_new_rank int;
 v_old_state text;
 v_inserted int:=0;
 v_changed boolean:=false;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 IF p_message_id IS NULL OR
   p_message_id !~ '^wamid\.[A-Za-z0-9=+/_-]{3,250}$' OR
   p_status IS NULL OR p_status NOT IN ('sent','delivered','read','failed') OR
   p_occurred_at IS NULL OR
   p_occurred_at>now()+interval '5 minutes' OR
   p_occurred_at<now()-interval '30 days'
 THEN
   RETURN jsonb_build_object('accepted',false,'reason','invalid_status');
 END IF;
 SELECT * INTO v_attempt FROM public.crm_delivery_attempts
  WHERE provider_message_id=p_message_id FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('accepted',false,'reason','unrecognized_message_id');
 END IF;

 INSERT INTO public.crm_delivery_status_events(
   provider_message_id,provider_status,provider_occurred_at
 ) VALUES(p_message_id,p_status,p_occurred_at)
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;

 v_old_state:=v_attempt.state;
 v_old_rank:=CASE v_old_state
   WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
   WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 ELSE -1 END;
 v_new_rank:=CASE p_status
   WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2
   WHEN 'read' THEN 3 ELSE -1 END;

 IF p_status='failed' THEN
   -- A failed update must never overwrite a known delivery/read receipt.
   IF v_old_state IN ('accepted','sent') THEN
     UPDATE public.crm_delivery_attempts SET state='failed',
       provider_status_at=p_occurred_at,updated_at=now()
     WHERE follow_up_id=v_attempt.follow_up_id;
     v_changed:=true;
   END IF;
 ELSIF v_old_state<>'failed' AND v_new_rank>v_old_rank THEN
   UPDATE public.crm_delivery_attempts SET state=p_status,
     provider_status_at=p_occurred_at,updated_at=now()
   WHERE follow_up_id=v_attempt.follow_up_id;
   v_changed:=true;
 END IF;

 RETURN jsonb_build_object('accepted',true,'duplicate',v_inserted=0,
   'state_changed',v_changed,'state',
   CASE WHEN v_changed THEN p_status ELSE v_old_state END);
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_record_meta_delivery_status(text,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_meta_delivery_status(text,text,timestamptz)
 TO service_role;

-- Aggregate counts, no provider IDs or recipient phones exposed to staff.
CREATE FUNCTION public.crm_delivery_receipt_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_summary jsonb;
BEGIN
 PERFORM public.crm_require_staff();
 SELECT jsonb_build_object(
   'prepared',count(*) FILTER (WHERE state='prepared'),
   'accepted',count(*) FILTER (WHERE state='accepted'),
   'sent',count(*) FILTER (WHERE state='sent'),
   'delivered',count(*) FILTER (WHERE state='delivered'),
   'read',count(*) FILTER (WHERE state='read'),
   'failed',count(*) FILTER (WHERE state='failed'),
   'unknown_outcome',count(*) FILTER (WHERE state='unknown_outcome'),
   'mode','provider_not_enabled'
 ) INTO v_summary FROM public.crm_delivery_attempts;
 RETURN v_summary;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_delivery_receipt_summary()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_delivery_receipt_summary()
 TO authenticated;
COMMIT;
