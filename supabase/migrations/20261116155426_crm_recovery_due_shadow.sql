-- CANDIDATE ONLY. No scheduler, webhook deployment or public CRM mutation.
BEGIN;
CREATE TABLE crm_recovery_private.due_checks (
 follow_up_id uuid PRIMARY KEY REFERENCES public.crm_follow_ups(id) ON DELETE CASCADE,
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 lease_token uuid, lease_until timestamptz,
 revision text CHECK(revision IS NULL OR revision ~ '^[a-f0-9]{32}$'),
 decision_revision text CHECK(decision_revision IS NULL OR decision_revision ~ '^[a-f0-9]{32}$'),
 classification text CHECK(classification IN ('blocked','shadow_candidate','suppressed','pending_service','insufficient_evidence')),
 blockers text[] NOT NULL DEFAULT '{}',
 send_authorized boolean NOT NULL DEFAULT false CHECK(send_authorized=false),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1000000),
 next_check_at timestamptz NOT NULL DEFAULT now(),
 evaluated_at timestamptz, valid_until timestamptz,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 CHECK(cardinality(blockers)<=40 AND blockers <@ ARRAY[
 'invalid_clock_or_delay','unverified_or_invalid_event','order_check_incomplete',
 'conversation_history_incomplete','conversation_identity_unresolved','opt_out','paid_order','canceled_order',
 'purchase_or_order_requires_reconciliation','declined','no_verified_inbound','store_response_pending',
 'outside_service_window','interest_unconfirmed','permission_unverified','store_closed','store_not_verified_open',
 'availability_unverified','product_or_variant_unresolved','not_due','already_contacted_since_reply',
 'snapshot_configuration_invalid','conversation_unavailable','conversation_time_invalid','customer_identity_unavailable',
 'automation_settings_unavailable','tintim_time_unverified','signed_observation_rejected',
 'signed_observation_identity_mismatch','message_identity_conflict','conversation_activity_not_covered',
 'linked_order_unavailable','unattributed_orders_in_window','snapshot_changed_during_read',
 'conversation_not_active','inbound_content_unverified','snapshot_source_unavailable_or_incomplete']::text[])
);
CREATE INDEX due_checks_ready ON crm_recovery_private.due_checks(next_check_at,follow_up_id);
ALTER TABLE crm_recovery_private.due_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.due_checks FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crm_recovery_permission_evidence(p_customer_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 RETURN EXISTS(SELECT 1 FROM public.crm_customers u JOIN public.crm_consent_audit a ON a.customer_id=u.id
  WHERE u.id=p_customer_id AND u.consent_status='granted' AND u.commercial_opt_out=false
   AND u.consent_at<=now() AND length(trim(u.consent_evidence)) BETWEEN 8 AND 240
   AND a.new_status='granted' AND a.new_opt_out=false AND a.actor_user_id IS NOT NULL
   AND a.new_evidence=u.consent_evidence AND a.new_consent_at=u.consent_at
   AND a.recorded_at>=u.consent_at AND a.recorded_at<=now());
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_permission_evidence(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_permission_evidence(uuid) TO service_role;

-- Private optimistic revision. No source body/phone/evidence is returned or stored.
-- Changes to activity, payment, availability, permission, settings or semantics
-- invalidate a decision computed outside this transaction.
CREATE FUNCTION crm_recovery_private.source_revision(p_follow_up_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_array(
  jsonb_build_array(f.status,f.due_at,f.sent_at,c.status,c.updated_at,c.last_inbound_at,c.last_outbound_at,
   u.phone_e164,u.updated_at,u.consent_status,u.consent_at,u.consent_evidence,u.commercial_opt_out),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_whatsapp_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=greatest(c.created_at,now()-interval '24 hours')),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_tintim_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=greatest(c.created_at,now()-interval '24 hours')),
  (SELECT jsonb_agg(jsonb_build_array(o.id,o.updated_at,o.customer_phone,o.payment_status,o.order_status,o.paid_at) ORDER BY o.id)
   FROM public.orders o WHERE (o.created_at>=greatest(c.created_at,now()-interval '24 hours') OR o.paid_at>=greatest(c.created_at,now()-interval '24 hours')) OR o.id IN (SELECT l.order_uuid FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id)),
  (SELECT jsonb_agg(jsonb_build_array(x.id,x.status,x.sent_at,x.due_at) ORDER BY x.id) FROM public.crm_follow_ups x WHERE x.conversation_id=c.id),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.menu_availability a),
  public.public_crocante_inventory(),
  (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.store_settings s WHERE s.key='orders_open'),
  (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.message_id) FROM crm_recovery_private.observations o WHERE o.conversation_id=c.id AND o.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id),
  (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.tintim_conversations t WHERE t.phone_digits IN(u.phone_e164,substring(u.phone_e164 from 3))),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$$;
REVOKE ALL ON FUNCTION crm_recovery_private.source_revision(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crm_recovery_claim_due(p_authorized_phones text[])
RETURNS TABLE(follow_up_id uuid,conversation_id uuid,lease_token uuid,revision text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j record; v_revision text; v_token uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_authorized_phones IS NULL OR cardinality(p_authorized_phones) NOT BETWEEN 1 AND 5
  OR EXISTS(SELECT 1 FROM unnest(p_authorized_phones) p WHERE p IS NULL OR p !~ '^55[0-9]{10,11}$')
 THEN RAISE EXCEPTION 'invalid_scope'; END IF;
 IF NOT pg_try_advisory_xact_lock(72180311,20261116) THEN RETURN; END IF;
 INSERT INTO crm_recovery_private.due_checks(follow_up_id,conversation_id)
 SELECT f.id,c.id FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id
 WHERE f.status='pending' AND f.sent_at IS NULL AND f.due_at<=now() AND f.due_at>=now()-interval '24 hours'
  AND c.status='waiting_customer' AND u.phone_e164=ANY(p_authorized_phones)
  AND NOT EXISTS(SELECT 1 FROM public.crm_follow_ups newer WHERE newer.conversation_id=c.id AND newer.status='pending'
   AND (newer.due_at,newer.id)>(f.due_at,f.id))
  AND EXISTS(SELECT 1 FROM crm_recovery_private.observations o WHERE o.conversation_id=c.id AND o.expires_at>now() AND o.occurred_at>=now()-interval '24 hours')
 ORDER BY f.due_at,f.id LIMIT 5 ON CONFLICT DO NOTHING;
 FOR j IN SELECT d.* FROM crm_recovery_private.due_checks d
 JOIN public.crm_follow_ups f ON f.id=d.follow_up_id JOIN public.crm_conversations c ON c.id=d.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id
 WHERE d.expires_at>now() AND d.next_check_at<=now() AND coalesce(d.lease_until,'-infinity')<=now()
  AND f.status='pending' AND f.sent_at IS NULL AND f.due_at<=now() AND f.due_at>=now()-interval '24 hours'
  AND c.status='waiting_customer' AND u.phone_e164=ANY(p_authorized_phones)
  AND NOT EXISTS(SELECT 1 FROM public.crm_follow_ups newer WHERE newer.conversation_id=c.id AND newer.status='pending'
   AND (newer.due_at,newer.id)>(f.due_at,f.id))
 ORDER BY d.next_check_at,d.follow_up_id LIMIT 5 FOR UPDATE OF d SKIP LOCKED
 LOOP
  v_revision:=crm_recovery_private.source_revision(j.follow_up_id);
  -- Skip a repeated input while its prior decision still has a valid freshness lease.
  IF j.decision_revision=v_revision AND j.valid_until>now() THEN CONTINUE; END IF;
  v_token:=gen_random_uuid();
  UPDATE crm_recovery_private.due_checks d SET lease_token=v_token,lease_until=now()+interval '90 seconds',
   revision=v_revision,attempts=least(d.attempts+1,1000000),valid_until=NULL WHERE d.follow_up_id=j.follow_up_id;
  follow_up_id:=j.follow_up_id;conversation_id:=j.conversation_id;lease_token:=v_token;revision:=v_revision;RETURN NEXT;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_claim_due(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_claim_due(text[]) TO service_role;

CREATE FUNCTION public.crm_recovery_finish_due(p_follow_up_id uuid,p_lease_token uuid,p_revision text,
 p_classification text,p_blockers text[],p_retry boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j crm_recovery_private.due_checks%ROWTYPE; v_current text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 SELECT * INTO j FROM crm_recovery_private.due_checks d WHERE d.follow_up_id=p_follow_up_id FOR UPDATE;
 IF NOT FOUND OR p_lease_token IS NULL OR j.lease_token IS DISTINCT FROM p_lease_token OR j.lease_until<=now()
  OR j.revision IS DISTINCT FROM p_revision THEN RETURN 'stale'; END IF;
 v_current:=crm_recovery_private.source_revision(p_follow_up_id);
 IF v_current IS DISTINCT FROM p_revision OR NOT EXISTS(SELECT 1 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
  WHERE f.id=p_follow_up_id AND f.status='pending' AND f.sent_at IS NULL AND f.due_at<=now() AND c.status='waiting_customer')
 THEN
  UPDATE crm_recovery_private.due_checks SET lease_token=NULL,lease_until=NULL,valid_until=NULL,next_check_at=now() WHERE follow_up_id=p_follow_up_id;
  RETURN 'stale';
 END IF;
 IF p_retry THEN
  UPDATE crm_recovery_private.due_checks SET lease_token=NULL,lease_until=NULL,valid_until=NULL,
   next_check_at=now()+CASE WHEN attempts>=5 THEN interval '30 minutes' ELSE interval '2 minutes' END
   WHERE follow_up_id=p_follow_up_id;
  RETURN 'retry';
 END IF;
 IF p_classification IS NULL OR p_blockers IS NULL OR p_classification NOT IN ('blocked','shadow_candidate','suppressed','pending_service','insufficient_evidence')
  OR (p_classification='shadow_candidate' AND cardinality(p_blockers)<>0) THEN RAISE EXCEPTION 'invalid_decision'; END IF;
 UPDATE crm_recovery_private.due_checks SET classification=p_classification,blockers=p_blockers,
  decision_revision=p_revision,evaluated_at=now(),valid_until=now()+interval '2 minutes',attempts=0,
  lease_token=NULL,lease_until=NULL,next_check_at=now()+interval '5 minutes' WHERE follow_up_id=p_follow_up_id;
 RETURN 'recorded';
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_finish_due(uuid,uuid,text,text,text[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_finish_due(uuid,uuid,text,text,text[],boolean) TO service_role;

-- Consumers must use this reader, never treat a stored classification as a send gate.
CREATE FUNCTION public.crm_recovery_read_due(p_authorized_phones text[])
RETURNS TABLE(follow_up_id uuid,conversation_id uuid,classification text,blockers text[],
 evaluated_at timestamptz,valid_until timestamptz,send_authorized boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_authorized_phones IS NULL OR cardinality(p_authorized_phones) NOT BETWEEN 1 AND 5
  OR EXISTS(SELECT 1 FROM unnest(p_authorized_phones) p WHERE p IS NULL OR p !~ '^55[0-9]{10,11}$')
 THEN RAISE EXCEPTION 'invalid_scope'; END IF;
 RETURN QUERY SELECT d.follow_up_id,d.conversation_id,
  CASE WHEN fresh.ok THEN d.classification ELSE 'insufficient_evidence' END,
  CASE WHEN fresh.ok THEN d.blockers ELSE ARRAY['snapshot_changed_during_read']::text[] END,
  d.evaluated_at,CASE WHEN fresh.ok THEN d.valid_until ELSE NULL END,false
 FROM crm_recovery_private.due_checks d JOIN public.crm_follow_ups f ON f.id=d.follow_up_id
 JOIN public.crm_conversations c ON c.id=d.conversation_id JOIN public.crm_customers u ON u.id=c.customer_id
 CROSS JOIN LATERAL(SELECT coalesce(d.valid_until>now() AND d.lease_token IS NULL AND
  d.decision_revision=crm_recovery_private.source_revision(d.follow_up_id) AND f.status='pending'
  AND f.sent_at IS NULL AND c.status='waiting_customer',false) ok) fresh
 WHERE u.phone_e164=ANY(p_authorized_phones) AND d.evaluated_at IS NOT NULL AND d.expires_at>now()
 ORDER BY d.evaluated_at DESC,d.follow_up_id LIMIT 5;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_read_due(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_read_due(text[]) TO service_role;

-- Extend the existing bounded maintenance function; no cron alteration here.
CREATE OR REPLACE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;b integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT(session_user='postgres' AND auth.role() IS NULL)
 THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 WITH expired AS (SELECT conversation_id,message_id FROM crm_recovery_private.observations WHERE expires_at<=now()
 ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.observations o USING expired e WHERE o.conversation_id=e.conversation_id AND o.message_id=e.message_id;
 GET DIAGNOSTICS a=ROW_COUNT;
 WITH expired AS (SELECT follow_up_id FROM crm_recovery_private.due_checks WHERE expires_at<=now()
 ORDER BY expires_at,follow_up_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.due_checks d USING expired e WHERE d.follow_up_id=e.follow_up_id;
 GET DIAGNOSTICS b=ROW_COUNT; RETURN a+b;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_purge_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purge_expired() TO service_role;
COMMIT;
