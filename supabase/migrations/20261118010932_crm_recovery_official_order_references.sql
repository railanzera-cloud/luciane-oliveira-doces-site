-- Official inbound -> existing order: candidate association, never ownership/payment.
BEGIN;
CREATE TABLE crm_recovery_private.order_references (
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 message_id text NOT NULL CHECK(message_id ~ '^wamid\.[A-Za-z0-9=+/_-]+$' AND length(message_id) BETWEEN 9 AND 296),
 occurred_at timestamptz NOT NULL,
 order_number bigint NOT NULL CHECK(order_number BETWEEN 1 AND 9999999999),
 order_uuid uuid REFERENCES public.orders(id) ON DELETE SET NULL,
 resolution_status text NOT NULL CHECK(resolution_status IN('matched','unmatched','conflict')),
 reference_status text NOT NULL DEFAULT 'candidate' CHECK(reference_status='candidate'),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 PRIMARY KEY(conversation_id,message_id)
);
CREATE INDEX order_references_order ON crm_recovery_private.order_references(order_uuid);
CREATE INDEX order_references_expiry ON crm_recovery_private.order_references(expires_at);
ALTER TABLE crm_recovery_private.order_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.order_references FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crm_recovery_store_order_reference(p_conversation_id uuid,p_message_id text,
 p_occurred_at timestamptz,p_order_number bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text;v_matches uuid[];v_order uuid;v_other_phone text;v_created timestamptz;r record;v_resolution text:='unmatched';
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_conversation_id IS NULL OR p_message_id IS NULL OR p_occurred_at IS NULL
  OR p_order_number IS NULL OR p_order_number<1 OR p_order_number>9999999999
  OR p_occurred_at>now() OR p_occurred_at<=now()-interval '24 hours'
 THEN RAISE EXCEPTION 'invalid_order_reference' USING ERRCODE='22023'; END IF;
 SELECT u.phone_e164 INTO v_phone FROM public.crm_conversations c
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE c.id=p_conversation_id;
 IF v_phone IS NULL OR NOT EXISTS(SELECT 1 FROM public.crm_whatsapp_message_events e
  JOIN crm_recovery_private.observations o ON o.conversation_id=e.conversation_id
   AND o.message_id=e.message_id AND o.occurred_at=e.occurred_at
  WHERE e.conversation_id=p_conversation_id AND e.message_id=p_message_id
   AND e.occurred_at=p_occurred_at AND e.direction='inbound' AND e.phone_e164=v_phone
   AND e.received_at>=e.occurred_at AND e.received_at<=now() AND o.expires_at>now())
 THEN RAISE EXCEPTION 'unverified_order_reference' USING ERRCODE='42501'; END IF;
 -- Serialize immutable message identity first, then candidate order ownership.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_conversation_id::text||':'||p_message_id,20261118));
 SELECT * INTO r FROM crm_recovery_private.order_references
 WHERE conversation_id=p_conversation_id AND message_id=p_message_id;
 IF FOUND THEN
  IF r.order_number=p_order_number AND r.occurred_at=p_occurred_at THEN RETURN 'duplicate'; END IF;
  RETURN 'identity_conflict';
 END IF;
 SELECT array_agg(id) INTO v_matches FROM public.orders WHERE order_number=p_order_number;
 IF cardinality(v_matches)=1 THEN
  v_order:=v_matches[1];
  SELECT customer_phone,created_at INTO v_other_phone,v_created FROM public.orders WHERE id=v_order FOR KEY SHARE;
  -- The provider reports whole seconds: permit creation within that SAME second.
  IF v_created IS NOT NULL AND v_created<p_occurred_at+interval '1 second'
     AND v_created>=p_occurred_at-interval '24 hours' THEN
   IF nullif(v_other_phone,'') IS NOT NULL AND regexp_replace(v_other_phone,'[^0-9]','','g')
      NOT IN(v_phone,substring(v_phone from 3)) THEN v_resolution:='conflict';
   ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended(v_order::text,20261118));
    IF EXISTS(SELECT 1 FROM crm_recovery_private.order_references x
      WHERE x.order_uuid=v_order AND x.conversation_id<>p_conversation_id AND x.expires_at>now())
    THEN v_resolution:='conflict'; ELSE v_resolution:='matched'; END IF;
   END IF;
  END IF;
 END IF;
 IF v_resolution<>'matched' THEN v_order:=NULL; END IF;
 INSERT INTO crm_recovery_private.order_references(conversation_id,message_id,occurred_at,order_number,order_uuid,resolution_status)
 VALUES(p_conversation_id,p_message_id,p_occurred_at,p_order_number,v_order,v_resolution);
 RETURN 'stored';
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_store_order_reference(uuid,text,timestamptz,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_store_order_reference(uuid,text,timestamptz,bigint) TO service_role;

CREATE FUNCTION public.crm_recovery_read_order_references(p_conversation_id uuid)
RETURNS TABLE(message_id text,occurred_at timestamptz,order_uuid uuid,reference_status text,resolution_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT r.message_id,r.occurred_at,r.order_uuid,r.reference_status,
 CASE WHEN r.order_uuid IS NULL AND r.resolution_status='matched' THEN 'unmatched' ELSE r.resolution_status END
 FROM crm_recovery_private.order_references r WHERE r.conversation_id=p_conversation_id
  AND r.expires_at>now() AND r.occurred_at>now()-interval '24 hours' AND r.occurred_at<=now()
 ORDER BY r.occurred_at,r.message_id LIMIT 1001;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_read_order_references(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_read_order_references(uuid) TO service_role;

CREATE OR REPLACE FUNCTION crm_recovery_private.source_revision(p_follow_up_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_array(
  jsonb_build_array(f.status,f.due_at,f.sent_at,c.status,c.updated_at,c.last_inbound_at,c.last_outbound_at,
   u.phone_e164,u.updated_at,u.consent_status,u.consent_at,u.consent_evidence,u.commercial_opt_out),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_whatsapp_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_tintim_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(jsonb_build_array(o.id,o.updated_at,o.customer_phone,o.payment_status,o.order_status,o.paid_at) ORDER BY o.id)
   FROM public.orders o WHERE (o.created_at>=now()-interval '24 hours' OR o.paid_at>=now()-interval '24 hours') OR o.id IN (SELECT r.order_uuid FROM crm_recovery_private.order_references r WHERE r.conversation_id=c.id) OR o.id IN (SELECT l.order_uuid FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id)),
  (SELECT jsonb_agg(jsonb_build_array(x.id,x.status,x.sent_at,x.due_at) ORDER BY x.id) FROM public.crm_follow_ups x WHERE x.conversation_id=c.id),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.menu_availability a),
  public.public_crocante_inventory(),
  (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.store_settings s WHERE s.key='orders_open'),
  (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.message_id) FROM crm_recovery_private.observations o WHERE o.conversation_id=c.id AND o.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id),
  (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.tintim_conversations t WHERE t.phone_digits IN(u.phone_e164,substring(u.phone_e164 from 3))),
  (SELECT jsonb_agg(jsonb_build_array(to_jsonb(s),s.enabled AND s.enabled_at<=now() AND s.expires_at>now())) FROM crm_recovery_private.episode_scope s WHERE s.conversation_id=c.id),
  (SELECT jsonb_agg(jsonb_build_array(r.id,r.received_at,md5(r.summary::text)) ORDER BY r.id) FROM public.tintim_webhook_receipts r
   WHERE r.summary->>'phone_digits' IN(u.phone_e164,substring(u.phone_e164 from 3)) OR EXISTS(
    SELECT 1 FROM public.tintim_conversations t WHERE t.phone_digits IN(u.phone_e164,substring(u.phone_e164 from 3))
     AND t.account_key=r.account_key AND t.external_lead_id=r.lead_key)),
  (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.message_id) FROM crm_recovery_private.order_references r WHERE r.conversation_id=c.id AND r.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$$;
CREATE OR REPLACE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;b integer;c integer;d integer;
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
 GET DIAGNOSTICS b=ROW_COUNT;
 WITH expired AS (SELECT nonce FROM crm_recovery_private.scheduler_invocations WHERE expires_at<=now()
 ORDER BY expires_at,nonce LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.scheduler_invocations s USING expired e WHERE s.nonce=e.nonce;
 GET DIAGNOSTICS c=ROW_COUNT;
 WITH expired AS (SELECT conversation_id,message_id FROM crm_recovery_private.order_references WHERE expires_at<=now()
 ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.order_references r USING expired e
 WHERE r.conversation_id=e.conversation_id AND r.message_id=e.message_id;
 GET DIAGNOSTICS d=ROW_COUNT;RETURN a+b+c+d;
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.source_revision(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.crm_recovery_purge_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purge_expired() TO service_role;
COMMIT;
