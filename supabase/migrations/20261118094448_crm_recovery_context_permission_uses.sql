-- CANDIDATE ONLY. Owner-only atomic preparation; no RPC, sender or network call.
-- A reservation is deliberately not recycled, including after timeout/crash.
BEGIN;
CREATE TABLE crm_recovery_private.context_permission_uses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 anchor_message_id text NOT NULL,
 offer_message_id text NOT NULL,
 -- Historical internal ID: deleting a follow-up must not release its consumed permission.
 follow_up_id uuid NOT NULL UNIQUE,
 purpose text NOT NULL CHECK(purpose='one_context_follow_up'),
 content_digest text NOT NULL CHECK(content_digest~'^[a-f0-9]{64}$'),
 source_revision text NOT NULL CHECK(source_revision~'^[a-f0-9]{32}$'),
 reserved_at timestamptz NOT NULL DEFAULT now(),
 valid_until timestamptz NOT NULL CHECK(valid_until>reserved_at),
 send_authorized boolean NOT NULL DEFAULT false CHECK(send_authorized=false),
 UNIQUE(conversation_id,anchor_message_id),
 FOREIGN KEY(conversation_id,offer_message_id)
  REFERENCES crm_recovery_private.context_permission_events(conversation_id,message_id) ON DELETE CASCADE
);
-- Retention follows the offer's existing bounded purge; no independent renewal.
ALTER TABLE crm_recovery_private.context_permission_uses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.context_permission_uses FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION crm_recovery_private.context_permission_state(p_conversation_id uuid)
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
 IF v_state NOT IN('revoked','scope_changed') THEN
  IF EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_uses use_row
   WHERE use_row.conversation_id=p_conversation_id AND use_row.anchor_message_id=v_anchor.message_id) THEN v_state:='used'; END IF;
 END IF;
 IF NOT v_scoped AND v_state NOT IN('revoked','used','scope_changed') THEN v_state:='disabled'; END IF;
 RETURN jsonb_build_object('scoped',v_scoped,'state',v_state,'verified',v_state='granted','scope','one_context_follow_up',
  'version','context-recovery-1','valid_until',v_until,'markers',v_markers,'send_authorized',false);
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.context_permission_state(uuid) FROM PUBLIC,anon,authenticated,service_role;

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
  (SELECT jsonb_agg(to_jsonb(use_row) ORDER BY use_row.id) FROM crm_recovery_private.context_permission_uses use_row WHERE use_row.conversation_id=c.id),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$$;

CREATE FUNCTION crm_recovery_private.reserve_context_permission(p_follow_up_id uuid,p_offer_message_id text,
 p_expected_revision text,p_purpose text,p_content_digest text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_cid uuid;v_follow public.crm_follow_ups;v_due crm_recovery_private.due_checks;
 v_offer crm_recovery_private.context_permission_events;v_permission jsonb;v_revision text;v_id uuid;v_until timestamptz;v_clock timestamptz;
BEGIN
 IF p_follow_up_id IS NULL OR p_offer_message_id IS NULL
  OR p_offer_message_id!~'^wamid\.[A-Za-z0-9=+/_-]+$' OR length(p_offer_message_id) NOT BETWEEN 9 AND 296
  OR p_expected_revision IS NULL OR p_expected_revision!~'^[a-f0-9]{32}$'
  OR p_content_digest IS NULL OR p_content_digest!~'^[a-f0-9]{64}$'
  OR p_purpose IS DISTINCT FROM 'one_context_follow_up'
 THEN RETURN jsonb_build_object('state','invalid_request','send_authorized',false); END IF;
 SELECT f.conversation_id INTO v_cid FROM public.crm_follow_ups f WHERE f.id=p_follow_up_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','unavailable','send_authorized',false); END IF;
 -- Same serialization key used by signed offer/accept/revoke capture.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_cid::text,20261119));
 SELECT * INTO v_follow FROM public.crm_follow_ups WHERE id=p_follow_up_id FOR UPDATE;
 IF NOT FOUND OR v_follow.conversation_id IS DISTINCT FROM v_cid OR v_follow.status<>'pending' OR v_follow.sent_at IS NOT NULL
  OR v_follow.due_at>clock_timestamp() OR v_follow.due_at<=clock_timestamp()-interval '24 hours'
 THEN RETURN jsonb_build_object('state','unavailable','send_authorized',false); END IF;
 -- A duplicate never returns an existing token, even with identical arguments.
 IF EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_uses u WHERE u.follow_up_id=p_follow_up_id)
 THEN RETURN jsonb_build_object('state','already_reserved','send_authorized',false); END IF;
 v_permission:=crm_recovery_private.context_permission_state(v_cid);
 IF v_permission->>'state'<>'granted' OR (v_permission->>'verified')::boolean IS DISTINCT FROM true
 THEN RETURN jsonb_build_object('state','permission_unavailable','send_authorized',false); END IF;
 SELECT * INTO v_offer FROM crm_recovery_private.context_permission_events o WHERE o.conversation_id=v_cid
  AND o.kind='offer' AND o.expires_at>now() AND o.occurred_at<=now()
  AND EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_interest(v_cid,now()) a
   WHERE a.message_id=o.anchor_message_id AND a.occurred_at=o.anchor_at)
 ORDER BY o.occurred_at DESC,o.message_id DESC LIMIT 1;
 IF NOT FOUND OR v_offer.message_id IS DISTINCT FROM p_offer_message_id
 THEN RETURN jsonb_build_object('state','permission_unavailable','send_authorized',false); END IF;
 SELECT * INTO v_due FROM crm_recovery_private.due_checks d WHERE d.follow_up_id=p_follow_up_id FOR UPDATE;
 v_revision:=crm_recovery_private.source_revision(p_follow_up_id);
 -- now() is transaction-start time: a lock wait must not keep a decision or
 -- scope artificially fresh. Recheck actual database time after waiting.
 v_clock:=clock_timestamp();
 IF NOT FOUND OR v_due.conversation_id IS DISTINCT FROM v_cid OR v_due.classification IS DISTINCT FROM 'shadow_candidate'
  OR cardinality(v_due.blockers) IS DISTINCT FROM 0 OR v_due.send_authorized IS DISTINCT FROM false
  OR v_due.lease_token IS NOT NULL OR v_due.lease_until IS NOT NULL OR v_due.expires_at<=v_clock
  OR v_due.evaluated_at IS NULL OR v_due.evaluated_at>v_clock OR v_due.valid_until IS NULL OR v_due.valid_until<=v_clock
  OR v_due.decision_revision IS DISTINCT FROM p_expected_revision OR v_revision IS DISTINCT FROM p_expected_revision
 THEN RETURN jsonb_build_object('state','decision_unavailable','send_authorized',false); END IF;
 IF NOT EXISTS(SELECT 1 FROM crm_recovery_private.context_permission_scope s WHERE s.conversation_id=v_cid
  AND s.enabled AND s.enabled_at<=v_clock AND s.expires_at>v_clock)
 THEN RETURN jsonb_build_object('state','permission_unavailable','send_authorized',false); END IF;
 v_until:=least(v_clock+interval '60 seconds',v_due.valid_until,(v_permission->>'valid_until')::timestamptz);
 IF v_until<=v_clock THEN RETURN jsonb_build_object('state','permission_unavailable','send_authorized',false); END IF;
 INSERT INTO crm_recovery_private.context_permission_uses(conversation_id,anchor_message_id,offer_message_id,
  follow_up_id,purpose,content_digest,source_revision,reserved_at,valid_until)
 VALUES(v_cid,v_offer.anchor_message_id,v_offer.message_id,p_follow_up_id,p_purpose,p_content_digest,p_expected_revision,v_clock,v_until)
 ON CONFLICT DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN RETURN jsonb_build_object('state','already_reserved','send_authorized',false); END IF;
 RETURN jsonb_build_object('state','reserved','reservation_id',v_id,'valid_until',v_until,'send_authorized',false);
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.reserve_context_permission(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
