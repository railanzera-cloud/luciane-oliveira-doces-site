-- Prepared candidate. No global consent, customer/order write or send authority.
BEGIN;
CREATE TABLE crm_recovery_private.context_permission_scope (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 conversation_id uuid NOT NULL UNIQUE REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 enabled_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 CHECK(expires_at>enabled_at AND expires_at<=enabled_at+interval '24 hours')
);
ALTER TABLE crm_recovery_private.context_permission_scope ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.context_permission_scope FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE crm_recovery_private.context_permission_events (
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 message_id text NOT NULL CHECK(message_id ~ '^wamid\.[A-Za-z0-9=+/_-]+$' AND length(message_id) BETWEEN 9 AND 296),
 occurred_at timestamptz NOT NULL,
 kind text NOT NULL CHECK(kind IN('offer','accept','revoke')),
 reply_to text,
 offer_message_id text,
 anchor_message_id text,
 anchor_at timestamptz,
 policy_version text NOT NULL CHECK(policy_version='context-recovery-1'),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 PRIMARY KEY(conversation_id,message_id),
 CHECK(kind='offer' OR anchor_message_id IS NOT NULL AND anchor_at IS NOT NULL)
);
CREATE INDEX context_permission_expiry ON crm_recovery_private.context_permission_events(expires_at);
ALTER TABLE crm_recovery_private.context_permission_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.context_permission_events FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION crm_recovery_private.context_permission_interest(p_conversation_id uuid,p_as_of timestamptz)
RETURNS TABLE(message_id text,occurred_at timestamptz) LANGUAGE sql STABLE SET search_path='' AS $$
 WITH candidates AS (
 SELECT e.message_id,e.occurred_at FROM public.crm_whatsapp_message_events e
 JOIN crm_recovery_private.observations o ON o.conversation_id=e.conversation_id
  AND o.message_id=e.message_id AND o.occurred_at=e.occurred_at
 JOIN public.crm_conversations c ON c.id=e.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id AND u.phone_e164=e.phone_e164
 WHERE e.conversation_id=p_conversation_id AND e.direction='inbound' AND o.expires_at>now()
  AND o.semantic->>'version'='shadow-1' AND o.semantic->>'intent'='interest'
  AND e.occurred_at>now()-interval '24 hours' AND e.occurred_at<=p_as_of AND e.occurred_at<=now()
  AND e.received_at>=e.occurred_at AND e.received_at<=now()
 ), latest AS(SELECT * FROM candidates WHERE occurred_at=(SELECT max(occurred_at) FROM candidates))
 SELECT * FROM latest WHERE (SELECT count(*) FROM latest)=1;
$$;
CREATE FUNCTION crm_recovery_private.context_permission_last_offer(p_conversation_id uuid,p_offer text,p_before timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(*)=1 AND coalesce(bool_and(e.message_id=p_offer AND e.phone_e164=u.phone_e164
  AND e.received_at>=e.occurred_at AND e.received_at<=now()),false)
 FROM public.crm_whatsapp_message_events e JOIN public.crm_conversations c ON c.id=e.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id
 WHERE e.conversation_id=p_conversation_id AND e.direction='app_echo'
  AND e.occurred_at=(SELECT max(x.occurred_at) FROM public.crm_whatsapp_message_events x
   WHERE x.conversation_id=p_conversation_id AND x.direction='app_echo' AND x.occurred_at<p_before);
$$;
REVOKE ALL ON FUNCTION crm_recovery_private.context_permission_interest(uuid,timestamptz),
 crm_recovery_private.context_permission_last_offer(uuid,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crm_recovery_store_context_permission(p_conversation_id uuid,p_message_id text,
 p_occurred_at timestamptz,p_kind text,p_reply_to text,p_policy_version text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_anchor record;v_offer crm_recovery_private.context_permission_events;v_old crm_recovery_private.context_permission_events;
 v_phone text;v_denied boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN('offer','accept','revoke') OR p_policy_version IS DISTINCT FROM 'context-recovery-1'
  OR p_occurred_at IS NULL OR p_occurred_at>now() OR p_occurred_at<=now()-interval '24 hours'
  OR p_message_id IS NULL OR p_message_id!~'^wamid\.[A-Za-z0-9=+/_-]+$'
  OR (p_kind='offer' AND p_reply_to IS NOT NULL)
 THEN RAISE EXCEPTION 'context_permission_invalid' USING ERRCODE='22023'; END IF;
 SELECT u.phone_e164,u.commercial_opt_out IS DISTINCT FROM false OR u.consent_status='denied'
 INTO v_phone,v_denied FROM public.crm_conversations c JOIN public.crm_customers u ON u.id=c.customer_id WHERE c.id=p_conversation_id;
 IF v_phone IS NULL OR NOT EXISTS(SELECT 1 FROM public.crm_whatsapp_message_events e
  WHERE e.conversation_id=p_conversation_id AND e.message_id=p_message_id AND e.occurred_at=p_occurred_at
   AND e.phone_e164=v_phone AND e.direction=CASE WHEN p_kind='offer' THEN 'app_echo' ELSE 'inbound' END
   AND e.received_at>=e.occurred_at AND e.received_at<=now())
 THEN RAISE EXCEPTION 'context_permission_unverified' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_conversation_id::text,20261119));
 SELECT * INTO v_old FROM crm_recovery_private.context_permission_events WHERE conversation_id=p_conversation_id AND message_id=p_message_id;
 IF FOUND THEN
  IF v_old.occurred_at=p_occurred_at AND v_old.kind=p_kind AND v_old.reply_to IS NOT DISTINCT FROM p_reply_to
   AND v_old.policy_version=p_policy_version THEN RETURN 'duplicate'; END IF;
  RAISE EXCEPTION 'context_permission_identity_conflict' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_anchor FROM crm_recovery_private.context_permission_interest(p_conversation_id,p_occurred_at);
 IF NOT FOUND OR v_anchor.occurred_at>=p_occurred_at THEN
  IF p_kind<>'offer' THEN RETURN 'ineligible'; END IF;
  v_anchor.message_id:=NULL;v_anchor.occurred_at:=NULL;
 END IF;
 IF coalesce(v_denied,true) AND p_kind<>'revoke' THEN RETURN 'ineligible'; END IF;
 IF p_kind<>'revoke' AND EXISTS(SELECT 1 FROM crm_recovery_private.observations s
  JOIN public.crm_whatsapp_message_events e ON e.conversation_id=s.conversation_id AND e.message_id=s.message_id AND e.occurred_at=s.occurred_at
  WHERE s.conversation_id=p_conversation_id AND s.semantic->>'intent'='opt_out' AND s.expires_at>now()
   AND e.direction='inbound' AND e.phone_e164=v_phone AND e.occurred_at>now()-interval '24 hours'
   AND e.occurred_at<=now() AND e.received_at>=e.occurred_at AND e.received_at<=now()) THEN RETURN 'ineligible'; END IF;
 IF p_kind<>'revoke' AND NOT EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_scope s
  WHERE s.conversation_id=p_conversation_id AND s.enabled AND s.enabled_at<=now() AND s.expires_at>now()) THEN RETURN 'ineligible'; END IF;
 IF p_kind='accept' THEN
  SELECT * INTO v_offer FROM crm_recovery_private.context_permission_events o
  WHERE o.conversation_id=p_conversation_id AND o.kind='offer' AND o.expires_at>now()
   AND o.occurred_at<p_occurred_at AND o.anchor_message_id=v_anchor.message_id AND o.anchor_at=v_anchor.occurred_at
   AND o.occurred_at>now()-interval '24 hours'
   AND ((p_reply_to IS NOT NULL AND o.message_id=p_reply_to) OR
    (p_reply_to IS NULL AND crm_recovery_private.context_permission_last_offer(p_conversation_id,o.message_id,p_occurred_at)))
  ORDER BY o.occurred_at DESC,o.message_id LIMIT 1;
  IF NOT FOUND OR EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_events r
   WHERE r.conversation_id=p_conversation_id AND r.kind='revoke' AND r.anchor_message_id=v_anchor.message_id
    AND r.occurred_at>=v_offer.occurred_at AND r.occurred_at<=p_occurred_at AND r.expires_at>now()) THEN RETURN 'ineligible'; END IF;
  IF EXISTS(SELECT 1 FROM public.crm_consent_audit audit JOIN public.crm_conversations c ON c.customer_id=audit.customer_id
   WHERE c.id=p_conversation_id AND audit.recorded_at>=v_offer.occurred_at AND audit.recorded_at<=now()
    AND (audit.new_opt_out=true OR audit.new_status='denied')) THEN RETURN 'ineligible'; END IF;
 END IF;
 INSERT INTO crm_recovery_private.context_permission_events(conversation_id,message_id,occurred_at,kind,reply_to,
  offer_message_id,anchor_message_id,anchor_at,policy_version)
 VALUES(p_conversation_id,p_message_id,p_occurred_at,p_kind,p_reply_to,
  CASE WHEN p_kind='offer' THEN p_message_id WHEN p_kind='accept' THEN v_offer.message_id ELSE NULL END,
  v_anchor.message_id,v_anchor.occurred_at,p_policy_version);
 RETURN 'stored';
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_store_context_permission(uuid,text,timestamptz,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_store_context_permission(uuid,text,timestamptz,text,text,text) TO service_role;

CREATE FUNCTION crm_recovery_private.context_permission_state(p_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE v_scoped boolean;v_anchor record;o crm_recovery_private.context_permission_events;a crm_recovery_private.context_permission_events;
 v_state text:='missing';v_until timestamptz;v_markers jsonb;v_invalid boolean;
BEGIN
 SELECT EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_scope s WHERE s.conversation_id=p_conversation_id
  AND s.enabled AND s.enabled_at<=now() AND s.expires_at>now()) INTO v_scoped;
 SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',r.message_id,'occurred_at',r.occurred_at,'kind',r.kind)
  ORDER BY r.occurred_at,r.message_id),'[]'::jsonb),coalesce(bool_or(NOT EXISTS(
   SELECT 1 FROM public.crm_whatsapp_message_events e JOIN public.crm_conversations c ON c.id=e.conversation_id
   JOIN public.crm_customers u ON u.id=c.customer_id AND u.phone_e164=e.phone_e164
   WHERE e.conversation_id=r.conversation_id AND e.message_id=r.message_id AND e.occurred_at=r.occurred_at
    AND e.direction=CASE WHEN r.kind='offer' THEN 'app_echo' ELSE 'inbound' END
    AND e.received_at>=e.occurred_at AND e.received_at<=now())),false)
 INTO v_markers,v_invalid FROM (SELECT * FROM crm_recovery_private.context_permission_events
  WHERE conversation_id=p_conversation_id AND expires_at>now() AND occurred_at>now()-interval '24 hours' AND occurred_at<=now()
  ORDER BY occurred_at,message_id LIMIT 1001) r;
 IF v_invalid OR jsonb_array_length(v_markers)>1000 THEN v_state:='scope_changed';v_markers:='[]'::jsonb;
 ELSE
  SELECT * INTO v_anchor FROM crm_recovery_private.context_permission_interest(p_conversation_id,now());
  IF FOUND THEN
   IF EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_events r WHERE r.conversation_id=p_conversation_id
     AND r.kind='revoke' AND r.anchor_message_id=v_anchor.message_id AND r.anchor_at=v_anchor.occurred_at
     AND r.expires_at>now() AND r.occurred_at<=now() AND NOT EXISTS(
      SELECT 1 FROM crm_recovery_private.context_permission_events newer WHERE newer.conversation_id=p_conversation_id
       AND newer.kind='offer' AND newer.anchor_message_id=v_anchor.message_id AND newer.expires_at>now()
       AND newer.occurred_at>r.occurred_at AND newer.occurred_at<=now())) THEN v_state:='revoked';
   ELSE
    SELECT * INTO o FROM crm_recovery_private.context_permission_events r WHERE r.conversation_id=p_conversation_id
     AND r.kind='offer' AND r.anchor_message_id=v_anchor.message_id AND r.anchor_at=v_anchor.occurred_at
     AND r.expires_at>now() AND r.occurred_at<=now() ORDER BY r.occurred_at DESC,r.message_id DESC LIMIT 1;
    IF FOUND THEN
     v_until:=least(o.occurred_at+interval '24 hours',o.anchor_at+interval '24 hours');v_state:='pending';
     SELECT * INTO a FROM crm_recovery_private.context_permission_events r WHERE r.conversation_id=p_conversation_id
      AND r.kind='accept' AND r.offer_message_id=o.message_id AND r.anchor_message_id=o.anchor_message_id
      AND r.anchor_at=o.anchor_at AND r.expires_at>now() AND r.occurred_at<=now() AND r.occurred_at>o.occurred_at
      AND (r.reply_to=o.message_id OR r.reply_to IS NULL AND crm_recovery_private.context_permission_last_offer(p_conversation_id,o.message_id,r.occurred_at))
     ORDER BY r.occurred_at DESC,r.message_id DESC LIMIT 1;
     IF FOUND THEN v_state:='granted'; END IF;
     IF v_until<=now() THEN v_state:='expired'; END IF;
     IF EXISTS(SELECT 1 FROM public.crm_follow_ups f WHERE f.conversation_id=p_conversation_id
      AND f.sent_at>=o.occurred_at AND f.sent_at<=now()) THEN v_state:='used'; END IF;
    ELSIF jsonb_array_length(v_markers)>0 THEN v_state:='scope_changed'; END IF;
   END IF;
   IF EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_events r WHERE r.conversation_id=p_conversation_id
    AND r.kind='revoke' AND r.anchor_message_id=v_anchor.message_id AND r.anchor_at=v_anchor.occurred_at
    AND r.expires_at>now() AND r.occurred_at<=now() AND r.occurred_at>=coalesce(a.occurred_at,'-infinity')) THEN v_state:='revoked'; END IF;
  ELSIF jsonb_array_length(v_markers)>0 THEN v_state:='scope_changed'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.crm_conversations c JOIN public.crm_customers u ON u.id=c.customer_id
  WHERE c.id=p_conversation_id AND (u.commercial_opt_out IS DISTINCT FROM false OR u.consent_status='denied')) THEN v_state:='revoked'; END IF;
 IF EXISTS(SELECT 1 FROM crm_recovery_private.observations s JOIN public.crm_whatsapp_message_events e
  ON e.conversation_id=s.conversation_id AND e.message_id=s.message_id AND e.occurred_at=s.occurred_at
  JOIN public.crm_conversations c ON c.id=e.conversation_id JOIN public.crm_customers u ON u.id=c.customer_id AND u.phone_e164=e.phone_e164
  WHERE s.conversation_id=p_conversation_id AND s.semantic->>'intent'='opt_out' AND s.expires_at>now()
   AND e.direction='inbound' AND e.occurred_at>now()-interval '24 hours' AND e.occurred_at<=now()
   AND e.received_at>=e.occurred_at AND e.received_at<=now()) THEN v_state:='revoked'; END IF;
 IF o.message_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.crm_consent_audit audit
  JOIN public.crm_conversations c ON c.customer_id=audit.customer_id WHERE c.id=p_conversation_id
   AND audit.recorded_at>=o.occurred_at AND audit.recorded_at<=now() AND (audit.new_opt_out=true OR audit.new_status='denied')) THEN v_state:='revoked'; END IF;
 IF NOT v_scoped AND v_state NOT IN('revoked','used','scope_changed') THEN v_state:='disabled'; END IF;
 RETURN jsonb_build_object('scoped',v_scoped,'state',v_state,'verified',v_state='granted','scope','one_context_follow_up',
  'version','context-recovery-1','valid_until',v_until,'markers',v_markers,'send_authorized',false);
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.context_permission_state(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.crm_recovery_read_context_permission(p_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 RETURN crm_recovery_private.context_permission_state(p_conversation_id);
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_read_context_permission(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_read_context_permission(uuid) TO service_role;
CREATE FUNCTION crm_recovery_private.context_permission_legacy_check(p_conversation_id uuid,p_legacy_valid boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE s jsonb;
BEGIN
 s:=crm_recovery_private.context_permission_state(p_conversation_id);
 IF s->>'state' IN('revoked','used','scope_changed') THEN RETURN false; END IF;
 RETURN coalesce((s->>'verified')::boolean,false) OR coalesce(p_legacy_valid,false);
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.context_permission_legacy_check(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION crm_recovery_private.source_revision(p_follow_up_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_array(
  jsonb_build_array(f.status,f.due_at,f.sent_at,c.status,c.updated_at,c.last_inbound_at,c.last_outbound_at,
   u.phone_e164,u.updated_at,u.consent_status,u.consent_at,u.consent_evidence,u.commercial_opt_out),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_whatsapp_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_tintim_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(jsonb_build_array(o.id,o.created_at,o.updated_at,o.customer_phone,o.payment_status,o.order_status,o.paid_at) ORDER BY o.id)
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
  (SELECT jsonb_agg(jsonb_build_array(to_jsonb(s),s.enabled AND s.enabled_at<=now() AND s.expires_at>now())) FROM crm_recovery_private.context_permission_scope s WHERE s.conversation_id=c.id),
  (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.message_id) FROM crm_recovery_private.context_permission_events p WHERE p.conversation_id=c.id AND p.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$$;

CREATE OR REPLACE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;b integer;c integer;d integer;v_context_deleted integer;
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
 GET DIAGNOSTICS d=ROW_COUNT;
 WITH expired AS(SELECT conversation_id,message_id FROM crm_recovery_private.context_permission_events WHERE expires_at<=now()
 ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.context_permission_events p USING expired x WHERE p.conversation_id=x.conversation_id AND p.message_id=x.message_id;
 GET DIAGNOSTICS v_context_deleted=ROW_COUNT;RETURN a+b+c+d+v_context_deleted;
END; $$;

CREATE OR REPLACE FUNCTION public.crm_followup_send_preflight(p_follow_up_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_f public.crm_follow_ups%ROWTYPE;
 v_c public.crm_conversations%ROWTYPE;
 v_u public.crm_customers%ROWTYPE;
 v_reasons text[] := ARRAY[]::text[];
 v_verified_inbound boolean := false;
 v_purchase_signal boolean := false;
 v_sender_enabled boolean := false;
BEGIN
 -- API callers must already be staff; a trusted provider may call as service_role.
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM public.crm_require_staff();
 END IF;
 IF p_follow_up_id IS NULL THEN
    RETURN jsonb_build_object('ready',false,'reasons',jsonb_build_array('invalid_id'));
 END IF;
 SELECT * INTO v_f FROM public.crm_follow_ups WHERE id=p_follow_up_id;
 IF NOT FOUND THEN
    RETURN jsonb_build_object('ready',false,'reasons',jsonb_build_array('not_found'));
 END IF;
 SELECT * INTO v_c FROM public.crm_conversations WHERE id=v_f.conversation_id;
 SELECT * INTO v_u FROM public.crm_customers WHERE id=v_c.customer_id;
 IF v_f.status IS DISTINCT FROM 'pending' THEN
    v_reasons:=array_append(v_reasons,'not_pending');
 END IF;
 IF v_f.due_at>now() THEN
    v_reasons:=array_append(v_reasons,'not_due');
 END IF;
 IF v_c.status IS DISTINCT FROM 'waiting_customer' THEN
    v_reasons:=array_append(v_reasons,'not_waiting_customer');
 END IF;
 IF v_u.commercial_opt_out IS DISTINCT FROM false THEN
    v_reasons:=array_append(v_reasons,'commercial_opt_out');
 END IF;
 IF NOT crm_recovery_private.context_permission_legacy_check(v_c.id,
    v_u.consent_status='granted' AND v_u.consent_at IS NOT NULL
    AND nullif(btrim(coalesce(v_u.consent_evidence,'')),'') IS NOT NULL) THEN
    v_reasons:=array_append(v_reasons,'consent_not_verified');
 END IF;
 IF v_c.last_inbound_at IS NULL
    OR v_c.last_inbound_at<=now()-interval '23 hours'
    OR v_c.last_inbound_at>now()+interval '1 minute' THEN
    v_reasons:=array_append(v_reasons,'outside_verified_service_window');
 END IF;
 IF v_c.last_outbound_at IS NULL
    OR v_c.last_inbound_at IS NULL
    OR v_c.last_outbound_at<=v_c.last_inbound_at THEN
    v_reasons:=array_append(v_reasons,'not_waiting_after_business_reply');
 END IF;
 -- Never interpret server webhook receive-time as Meta's original timestamp.
 -- Require a provider/Meta-origin inbound timestamp tied to the same conversation.
 SELECT EXISTS(
   SELECT 1 FROM public.crm_tintim_message_events e
   WHERE e.conversation_id=v_c.id AND e.direction='inbound'
     AND e.time_basis='provider_timestamp'
     AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
     AND v_c.last_inbound_at IS NOT NULL
     AND e.occurred_at BETWEEN v_c.last_inbound_at-interval '2 minutes'
                           AND v_c.last_inbound_at+interval '2 minutes'
 ) OR EXISTS(
   SELECT 1 FROM public.crm_whatsapp_message_events e
   WHERE e.conversation_id=v_c.id AND e.direction='inbound'
     AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
     AND v_c.last_inbound_at IS NOT NULL
     AND e.occurred_at BETWEEN v_c.last_inbound_at-interval '2 minutes'
                           AND v_c.last_inbound_at+interval '2 minutes'
 ) INTO v_verified_inbound;
 IF NOT v_verified_inbound THEN
    v_reasons:=array_append(v_reasons,'inbound_timestamp_unverified');
 END IF;

 -- Stage is an indication to STOP pending commercial contacts, not proof of revenue.
 SELECT EXISTS (
   SELECT 1 FROM public.tintim_conversations t
   WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND lower(btrim(coalesce(t.stage_label,'')))
       IN ('comprou','convertido','vendido','venda realizada') AND crm_recovery_private.tintim_episode_requires_review(v_c.id)
 ) OR EXISTS (
   SELECT 1 FROM public.orders o
   WHERE regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND o.created_at>=v_c.created_at-interval '1 hour'
     AND crm_recovery_private.site_order_requires_review(o.id,v_c.id)
     AND (o.payment_status::text='paid'
       OR o.order_status::text IN ('delivered','completed'))
 ) OR EXISTS (
   SELECT 1
   FROM public.tintim_order_links l
   JOIN public.tintim_conversations t ON t.id=l.conversation_id
   JOIN public.orders o ON o.id=l.order_uuid
   WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND l.status IN ('candidate','confirmed')
     AND crm_recovery_private.site_order_requires_review(o.id,v_c.id)
     AND (o.payment_status::text='paid'
       OR o.order_status::text IN ('delivered','completed'))
 ) INTO v_purchase_signal;
 IF v_purchase_signal THEN
    v_reasons:=array_append(v_reasons,'purchase_signal_review');
 END IF;
 SELECT automatic_sends_enabled INTO v_sender_enabled
 FROM public.crm_automation_settings WHERE singleton=true;
 IF NOT coalesce(v_sender_enabled,false) THEN
    v_reasons:=array_append(v_reasons,'sender_disabled');
 END IF;
 RETURN jsonb_build_object(
   'ready',cardinality(v_reasons)=0,
   'reasons',to_jsonb(v_reasons),
   'checked_at',now(),
   'follow_up_id',v_f.id,
   'note','read_only_preflight_not_delivery_authorization'
 );
END; $fn$;

CREATE OR REPLACE FUNCTION public.crm_automation_evaluate_pending()
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
     IF NOT crm_recovery_private.context_permission_legacy_check(r.conversation_id,
        r.consent_status='granted' AND r.consent_at IS NOT NULL
        AND nullif(btrim(coalesce(r.consent_evidence,'')),'') IS NOT NULL) THEN
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
            IN ('comprou','convertido','vendido','venda realizada') AND crm_recovery_private.tintim_episode_requires_review(r.conversation_id)
     ) OR EXISTS(
        SELECT 1 FROM public.orders o
        WHERE regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g')
          IN (r.phone_e164,substring(r.phone_e164 from 3))
          AND o.created_at>=r.conversation_created-interval '1 hour'
          AND crm_recovery_private.site_order_requires_review(o.id,r.conversation_id)
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



COMMIT;
