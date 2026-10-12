-- Registro inicial isolado da ponte Tintim -> Supabase.
-- Já aplicado no projeto comercial em 12/10/2026; versionado para auditoria/futuras bases.
-- Não cria gatilhos Purchase, não altera checkout nem tabelas de pedidos existentes.
CREATE TABLE IF NOT EXISTS public.tintim_webhook_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fingerprint text NOT NULL UNIQUE CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
 account_key text NOT NULL CHECK (char_length(account_key) BETWEEN 1 AND 100),
 lead_key text,
 event_type text NOT NULL CHECK (event_type IN ('lead_create','lead_update','lead_source_update')),
 observed_at timestamptz NOT NULL,
 summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(summary)='object'),
 received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tintim_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_key text NOT NULL,
 external_lead_id text NOT NULL,
 phone_digits text CHECK (phone_digits IS NULL OR phone_digits ~ '^[0-9]{10,15}$'),
 contact_name text,source_label text,stage_label text,
 campaign_id text,campaign_name text,adset_id text,adset_name text,
 ad_id text,ad_name text,
 visit_parameters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(visit_parameters)='object'),
 first_observed_at timestamptz NOT NULL,
 last_observed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_key,external_lead_id)
);
CREATE TABLE IF NOT EXISTS public.tintim_order_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_uuid uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 conversation_id uuid NOT NULL REFERENCES public.tintim_conversations(id) ON DELETE CASCADE,
 match_basis text NOT NULL CHECK (match_basis IN ('order_reference','phone_candidate','manual_confirmation')),
 status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','confirmed','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_uuid,conversation_id)
);
CREATE INDEX IF NOT EXISTS tintim_conversations_phone_idx ON public.tintim_conversations(phone_digits);
CREATE INDEX IF NOT EXISTS tintim_receipts_lead_idx ON public.tintim_webhook_receipts(account_key,lead_key,observed_at DESC);
CREATE INDEX IF NOT EXISTS tintim_order_links_conv_idx ON public.tintim_order_links(conversation_id);
ALTER TABLE public.tintim_webhook_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tintim_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tintim_order_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tintim_webhook_receipts,public.tintim_conversations,public.tintim_order_links FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.record_tintim_webhook_event(
 p_fingerprint text,p_account_key text,p_lead_key text,
 p_event_type text,p_observed_at timestamptz,p_summary jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_id uuid;
 v_updated integer:=0;
 v_summary jsonb:=COALESCE(p_summary,'{}'::jsonb);
 v_phone text:=NULLIF(v_summary->>'phone_digits','');
BEGIN
 IF p_fingerprint !~ '^[0-9a-f]{64}$'
  OR length(p_account_key) NOT BETWEEN 1 AND 100
  OR p_event_type NOT IN ('lead_create','lead_update','lead_source_update')
  OR jsonb_typeof(v_summary)<>'object' OR p_observed_at IS NULL
 THEN RAISE EXCEPTION 'invalid_tintim_event' USING ERRCODE='22023'; END IF;
 IF v_phone IS NOT NULL AND v_phone !~ '^[0-9]{10,15}$' THEN v_phone:=NULL; END IF;
 INSERT INTO public.tintim_webhook_receipts(fingerprint,account_key,lead_key,event_type,observed_at,summary)
 VALUES(p_fingerprint,p_account_key,p_lead_key,p_event_type,p_observed_at,v_summary)
 ON CONFLICT(fingerprint) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN RETURN jsonb_build_object('accepted',true,'duplicate',true); END IF;
 IF p_lead_key IS NOT NULL AND length(p_lead_key) BETWEEN 1 AND 160 THEN
 INSERT INTO public.tintim_conversations(
 account_key,external_lead_id,phone_digits,contact_name,source_label,stage_label,
 campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,
 visit_parameters,first_observed_at,last_observed_at
 ) VALUES(
 p_account_key,p_lead_key,v_phone,NULLIF(v_summary->>'contact_name',''),
 NULLIF(v_summary->>'source',''),NULLIF(v_summary->>'stage',''),
 NULLIF(v_summary->>'campaign_id',''),NULLIF(v_summary->>'campaign_name',''),
 NULLIF(v_summary->>'adset_id',''),NULLIF(v_summary->>'adset_name',''),
 NULLIF(v_summary->>'ad_id',''),NULLIF(v_summary->>'ad_name',''),
 COALESCE(v_summary->'visit_parameters','{}'::jsonb),p_observed_at,p_observed_at
 )
 ON CONFLICT(account_key,external_lead_id) DO UPDATE SET
 first_observed_at=LEAST(tintim_conversations.first_observed_at,EXCLUDED.first_observed_at),
 last_observed_at=GREATEST(tintim_conversations.last_observed_at,EXCLUDED.last_observed_at),
 phone_digits=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.phone_digits,tintim_conversations.phone_digits) ELSE tintim_conversations.phone_digits END,
 contact_name=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.contact_name,tintim_conversations.contact_name) ELSE tintim_conversations.contact_name END,
 source_label=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.source_label,tintim_conversations.source_label) ELSE tintim_conversations.source_label END,
 stage_label=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.stage_label,tintim_conversations.stage_label) ELSE tintim_conversations.stage_label END,
 campaign_id=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.campaign_id,tintim_conversations.campaign_id) ELSE tintim_conversations.campaign_id END,
 campaign_name=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.campaign_name,tintim_conversations.campaign_name) ELSE tintim_conversations.campaign_name END,
 adset_id=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.adset_id,tintim_conversations.adset_id) ELSE tintim_conversations.adset_id END,
 adset_name=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.adset_name,tintim_conversations.adset_name) ELSE tintim_conversations.adset_name END,
 ad_id=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.ad_id,tintim_conversations.ad_id) ELSE tintim_conversations.ad_id END,
 ad_name=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN COALESCE(EXCLUDED.ad_name,tintim_conversations.ad_name) ELSE tintim_conversations.ad_name END,
 visit_parameters=CASE WHEN EXCLUDED.last_observed_at>=tintim_conversations.last_observed_at THEN tintim_conversations.visit_parameters||EXCLUDED.visit_parameters ELSE tintim_conversations.visit_parameters END,
 updated_at=now();
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 END IF;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,'conversation_upserted',v_updated>0);
END $$;
REVOKE ALL ON FUNCTION public.record_tintim_webhook_event(text,text,text,text,timestamptz,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_tintim_webhook_event(text,text,text,text,timestamptz,jsonb) TO service_role;
