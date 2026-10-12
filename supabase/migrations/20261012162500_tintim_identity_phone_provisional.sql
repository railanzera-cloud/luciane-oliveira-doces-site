-- Ponte Tintim fase 2. Requer schema da fase 1.
ALTER TABLE public.tintim_conversations ADD COLUMN IF NOT EXISTS identity_basis text NOT NULL DEFAULT 'tintim_lead_id';
ALTER TABLE public.tintim_conversations DROP CONSTRAINT IF EXISTS tintim_conversations_identity_basis_check;
ALTER TABLE public.tintim_conversations
 ADD CONSTRAINT tintim_conversations_identity_basis_check
 CHECK (identity_basis IN ('tintim_lead_id','phone_provisional'));

CREATE OR REPLACE FUNCTION public.record_tintim_webhook_event_v2(
 p_fingerprint text,p_account_key text,p_lead_key text,p_event_type text,
 p_observed_at timestamptz,p_summary jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_phone text:=NULLIF(COALESCE(p_summary->>'phone_digits',''),'');
 v_effective_key text:=NULLIF(trim(COALESCE(p_lead_key,'')),'');
 v_provisional boolean:=false;
 v_result jsonb;
BEGIN
 IF v_effective_key IS NULL AND v_phone ~ '^[0-9]{10,15}$' THEN
  v_effective_key:='phone:'||v_phone;
  v_provisional:=true;
 END IF;
 v_result:=public.record_tintim_webhook_event(
   p_fingerprint,p_account_key,v_effective_key,p_event_type,p_observed_at,p_summary
 );
 IF v_provisional AND (v_result->>'duplicate')='false' THEN
  UPDATE public.tintim_conversations SET identity_basis='phone_provisional'
  WHERE account_key=p_account_key AND external_lead_id=v_effective_key;
 END IF;
 RETURN v_result||jsonb_build_object(
  'identity_basis', CASE WHEN v_effective_key IS NULL THEN 'unknown'
  WHEN v_provisional THEN 'phone_provisional' ELSE 'tintim_lead_id' END
 );
END $$;
REVOKE ALL ON FUNCTION public.record_tintim_webhook_event_v2(text,text,text,text,timestamptz,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_tintim_webhook_event_v2(text,text,text,text,timestamptz,jsonb)
 TO service_role;

-- Reconstituir contatos provisórios de receipts existentes, sem tratar telefone como ID oficial.
WITH keys AS (
 SELECT account_key,summary->>'phone_digits' phone_digits,
 MIN(observed_at) first_at,MAX(observed_at) last_at
 FROM public.tintim_webhook_receipts
 WHERE lead_key IS NULL AND (summary->>'phone_digits') ~ '^[0-9]{10,15}$'
 GROUP BY account_key,summary->>'phone_digits'
), latest AS (
 SELECT DISTINCT ON(r.account_key,r.summary->>'phone_digits')
 r.account_key,r.summary->>'phone_digits' phone_digits,r.summary
 FROM public.tintim_webhook_receipts r
 WHERE r.lead_key IS NULL AND (r.summary->>'phone_digits') ~ '^[0-9]{10,15}$'
 ORDER BY r.account_key,r.summary->>'phone_digits',r.observed_at DESC,r.received_at DESC
)
INSERT INTO public.tintim_conversations(
 account_key,external_lead_id,identity_basis,phone_digits,contact_name,source_label,stage_label,
 campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,visit_parameters,first_observed_at,last_observed_at
)
SELECT l.account_key,'phone:'||l.phone_digits,'phone_provisional',l.phone_digits,
 NULLIF(l.summary->>'contact_name',''),NULLIF(l.summary->>'source',''),NULLIF(l.summary->>'stage',''),
 NULLIF(l.summary->>'campaign_id',''),NULLIF(l.summary->>'campaign_name',''),NULLIF(l.summary->>'adset_id',''),
 NULLIF(l.summary->>'adset_name',''),NULLIF(l.summary->>'ad_id',''),NULLIF(l.summary->>'ad_name',''),
 COALESCE(l.summary->'visit_parameters','{}'::jsonb),k.first_at,k.last_at
FROM latest l JOIN keys k ON k.account_key=l.account_key AND k.phone_digits=l.phone_digits
ON CONFLICT(account_key,external_lead_id) DO NOTHING;
