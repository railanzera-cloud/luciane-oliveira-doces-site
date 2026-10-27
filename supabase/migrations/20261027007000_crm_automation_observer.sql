-- LOD comercial | CRM automation observability.
-- No WhatsApp sending; no triggers/updates on existing orders, payments or followups.
-- An audit-only 5-minute pg_cron job is deliberately separate from actual dispatch.
BEGIN;
CREATE TABLE public.crm_automation_queue (
  follow_up_id uuid PRIMARY KEY REFERENCES public.crm_follow_ups(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id),
  due_at timestamptz NOT NULL,
  queue_state text NOT NULL CHECK(queue_state IN ('scheduled','blocked','review_required','finished')),
  blockers text[] NOT NULL DEFAULT '{}'::text[],
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_automation_queue_by_state ON public.crm_automation_queue(queue_state,due_at);
ALTER TABLE public.crm_automation_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_automation_queue FROM PUBLIC,anon,authenticated;

CREATE TABLE public.crm_automation_monitor (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_evaluated_at timestamptz,
 examined integer NOT NULL DEFAULT 0 CHECK(examined>=0),
 scheduled integer NOT NULL DEFAULT 0 CHECK(scheduled>=0),
 blocked integer NOT NULL DEFAULT 0 CHECK(blocked>=0),
 finished integer NOT NULL DEFAULT 0 CHECK(finished>=0),
 review_required integer NOT NULL DEFAULT 0 CHECK(review_required>=0)
);
INSERT INTO public.crm_automation_monitor(singleton) VALUES(true);
ALTER TABLE public.crm_automation_monitor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_automation_monitor FROM PUBLIC,anon,authenticated;

-- This is NOT a send/claim method. It only keeps the status of every follow-up
-- understandable, including all conservatively blocked and historical entries.
-- Executable only by the owner postgres (cron) or the backend service_role.
CREATE FUNCTION public.crm_automation_evaluate_pending()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 r record;
 v_blockers text[];
 v_state text;
 v_processed int:=0;
 v_scheduled int:=0;
 v_blocked int:=0;
 v_finished int:=0;
 v_review int:=0;
 v_purchase boolean;
 v_verified boolean;
 v_sender boolean;
BEGIN
 IF session_user <> 'postgres' AND auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 SELECT automatic_sends_enabled INTO v_sender
 FROM public.crm_automation_settings WHERE singleton=true;
 -- Exact automation lifecycle is serialized; concurrent cron/webhook changes
 -- are read-only here, never turned into an actual send authorization.
 IF NOT pg_try_advisory_xact_lock(72180310,20261027) THEN
   RETURN jsonb_build_object('skipped','scan_already_running');
 END IF;
 FOR r IN
   SELECT f.id follow_up_id,f.conversation_id,f.status follow_up_status,
     f.due_at,f.created_at,c.status conversation_status,c.last_inbound_at,
     c.last_outbound_at,c.created_at conversation_created,
     u.phone_e164,u.consent_status,u.consent_at,u.consent_evidence,
     u.commercial_opt_out
   FROM public.crm_follow_ups f
   JOIN public.crm_conversations c ON c.id=f.conversation_id
   JOIN public.crm_customers u ON u.id=c.customer_id
   WHERE f.created_at > now()-interval '30 days'
   ORDER BY f.created_at DESC LIMIT 500
 LOOP
   v_processed:=v_processed+1;
   v_blockers:=ARRAY[]::text[];
   IF r.follow_up_status<>'pending' THEN
     v_state:='finished';
     v_finished:=v_finished+1;
   ELSIF r.due_at>now() THEN
     v_state:='scheduled';
     v_scheduled:=v_scheduled+1;
   ELSE
     v_state:='blocked';
     IF r.conversation_status<>'waiting_customer' THEN
       v_blockers:=array_append(v_blockers,'conversation_not_waiting');
     END IF;
     IF r.commercial_opt_out THEN
       v_blockers:=array_append(v_blockers,'customer_opted_out');
     END IF;
     IF r.consent_status<>'granted' OR r.consent_at IS NULL
        OR nullif(btrim(coalesce(r.consent_evidence,'')),'') IS NULL THEN
       v_blockers:=array_append(v_blockers,'consent_unverified');
     END IF;
     IF r.last_inbound_at IS NULL
       OR r.last_inbound_at<=now()-interval '23 hours'
       OR r.last_inbound_at>now()+interval '1 minute' THEN
       v_blockers:=array_append(v_blockers,'outside_verified_window');
     END IF;
     IF r.last_outbound_at IS NULL OR r.last_inbound_at IS NULL
       OR r.last_outbound_at<=r.last_inbound_at THEN
       v_blockers:=array_append(v_blockers,'business_reply_unverified');
     END IF;
     SELECT EXISTS(
       SELECT 1 FROM public.crm_tintim_message_events e
       WHERE e.conversation_id=r.conversation_id AND e.direction='inbound'
         AND e.time_basis='provider_timestamp'
         AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
         AND r.last_inbound_at IS NOT NULL
         AND e.occurred_at BETWEEN r.last_inbound_at-interval '2 minutes'
                               AND r.last_inbound_at+interval '2 minutes'
     ) OR EXISTS (
       SELECT 1 FROM public.crm_whatsapp_message_events e
       WHERE e.conversation_id=r.conversation_id AND e.direction='inbound'
         AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
         AND r.last_inbound_at IS NOT NULL
         AND e.occurred_at BETWEEN r.last_inbound_at-interval '2 minutes'
                               AND r.last_inbound_at+interval '2 minutes'
     ) INTO v_verified;
     IF NOT v_verified THEN
       v_blockers:=array_append(v_blockers,'provider_timestamp_unverified');
     END IF;
     -- Purchase is a suppression signal, never evidence of revenue.
     SELECT EXISTS(
        SELECT 1 FROM public.tintim_conversations t
        WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
          IN (r.phone_e164,substring(r.phone_e164 from 3))
          AND lower(btrim(coalesce(t.stage_label,'')))
            IN ('comprou','convertido','vendido','venda realizada')
     ) OR EXISTS(
        SELECT 1 FROM public.orders o
        WHERE regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g')
          IN (r.phone_e164,substring(r.phone_e164 from 3))
          AND o.created_at>=r.conversation_created-interval '1 hour'
          AND (o.payment_status::text='paid'
            OR o.order_status::text IN ('delivered','completed'))
     ) INTO v_purchase;
     IF v_purchase THEN
       v_blockers:=array_append(v_blockers,'possible_purchase');
     END IF;
     IF NOT coalesce(v_sender,false) THEN
       v_blockers:=array_append(v_blockers,'sender_disabled');
     END IF;
     -- Hard gate: no integration certification exists. Never treat this
     -- queue as authority to dispatch, even if another setting changes.
     v_blockers:=array_append(v_blockers,'provider_not_certified');
     IF cardinality(v_blockers)=0 THEN v_state:='review_required'; END IF;
     IF v_state='blocked' THEN v_blocked:=v_blocked+1;
     ELSE v_review:=v_review+1;
     END IF;
   END IF;
   INSERT INTO public.crm_automation_queue
     (follow_up_id,conversation_id,due_at,queue_state,blockers,evaluated_at)
   VALUES (r.follow_up_id,r.conversation_id,r.due_at,v_state,v_blockers,now())
   ON CONFLICT(follow_up_id) DO UPDATE SET
     conversation_id=excluded.conversation_id,
     due_at=excluded.due_at,
     queue_state=excluded.queue_state,
     blockers=excluded.blockers,
     evaluated_at=excluded.evaluated_at;
 END LOOP;
 UPDATE public.crm_automation_monitor SET last_evaluated_at=now(),
   examined=v_processed,scheduled=v_scheduled,blocked=v_blocked,
   finished=v_finished,review_required=v_review
 WHERE singleton=true;
 RETURN jsonb_build_object('examined',v_processed,'scheduled',v_scheduled,
   'blocked',v_blocked,'finished',v_finished,'review_required',v_review,
   'dispatched',0,'mode','observe_only');
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_automation_evaluate_pending()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_automation_evaluate_pending()
  TO service_role;

CREATE FUNCTION public.crm_automation_operational_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_report jsonb;
BEGIN
 PERFORM public.crm_require_staff();
 SELECT jsonb_build_object(
   'last_evaluated_at', m.last_evaluated_at,
   'evaluated',m.examined,'scheduled',m.scheduled,'blocked',m.blocked,
   'finished',m.finished,'review_required',m.review_required,
   'pending', (SELECT count(*) FROM public.crm_follow_ups WHERE status='pending'),
   'overdue',(SELECT count(*) FROM public.crm_follow_ups
              WHERE status='pending' AND due_at<=now()),
   'consented_customers',(SELECT count(*) FROM public.crm_customers
                           WHERE consent_status='granted' AND NOT commercial_opt_out),
   'provider_timestamps',(SELECT count(*) FROM public.crm_tintim_message_events
                             WHERE direction='inbound' AND time_basis='provider_timestamp'),
   'official_webhook_events',(SELECT count(*) FROM public.crm_whatsapp_message_events),
   'delivery_enabled',false,
   'channel','provider_not_certified',
   'source','read_only_automation_monitor'
 ) INTO v_report
 FROM public.crm_automation_monitor m WHERE singleton=true;
 RETURN coalesce(v_report,'{}'::jsonb);
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_automation_operational_report()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_automation_operational_report()
 TO authenticated;

CREATE FUNCTION public.crm_automation_queue_items()
RETURNS TABLE(follow_up_id uuid,conversation_id uuid,queue_state text,
 blockers text[],evaluated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 PERFORM public.crm_require_staff();
 RETURN QUERY SELECT q.follow_up_id,q.conversation_id,q.queue_state,
  q.blockers,q.evaluated_at FROM public.crm_automation_queue q
 JOIN public.crm_follow_ups f ON f.id=q.follow_up_id
 WHERE f.status='pending'
 ORDER BY q.due_at ASC LIMIT 150;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_automation_queue_items()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_automation_queue_items()
 TO authenticated;
COMMIT;
