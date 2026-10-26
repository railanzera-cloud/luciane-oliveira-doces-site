-- LOD comercial: observar mensagens com horario de recebimento quando Tintim omite
-- timestamp. Bloquear por padrao qualquer efeito comercial desses sinais ate homologacao.
BEGIN;

ALTER TABLE public.crm_tintim_message_events
 ADD COLUMN time_basis text NOT NULL DEFAULT 'provider_timestamp'
 CHECK (time_basis IN ('provider_timestamp','webhook_received'));

ALTER TABLE public.crm_tintim_observation_settings
 ADD COLUMN allow_received_time_followups boolean NOT NULL DEFAULT false,
 ADD COLUMN received_time_enabled_at timestamptz;

ALTER TABLE public.crm_tintim_observation_settings
 ADD CONSTRAINT crm_received_time_activation_consistent
 CHECK (NOT allow_received_time_followups OR received_time_enabled_at IS NOT NULL);

CREATE FUNCTION public.crm_record_tintim_message_v2(
 p_fingerprint text,
 p_phone text,
 p_direction text,
 p_occurred_at timestamptz,
 p_account_key text,
 p_time_basis text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_phone text;
 v_id uuid;
 v_apply boolean;
 v_allow_receipt boolean;
 v_enabled_at timestamptz;
 v_result jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 IF p_time_basis NOT IN ('provider_timestamp','webhook_received') THEN
  RETURN jsonb_build_object('accepted',false,'reason','invalid_time_basis');
 END IF;
 IF p_time_basis='provider_timestamp' THEN
  RETURN public.crm_record_tintim_message(
   p_fingerprint,p_phone,p_direction,p_occurred_at,p_account_key);
 END IF;

 -- Sem data do provedor, o relogio representa APENAS o recebimento no webhook.
 -- Nunca converter isso silenciosamente em data original ou enviar mensagens.
 IF p_account_key IS DISTINCT FROM '2c956a42-229f-4d21-ade6-4442f8c048ed'
    OR p_direction NOT IN ('inbound','business_outbound')
    OR p_fingerprint !~ '^[0-9a-f]{64}$'
    OR p_occurred_at IS NULL
    OR p_occurred_at > now()+interval '30 seconds'
    OR p_occurred_at < now()-interval '2 minutes'
 THEN RETURN jsonb_build_object('accepted',false,'reason','invalid_receipt_event'); END IF;

 BEGIN v_phone:=public.crm_normalize_br_phone(p_phone);
 EXCEPTION WHEN SQLSTATE '22023' THEN
  RETURN jsonb_build_object('accepted',false,'reason','invalid_phone');
 END;

 SELECT apply_to_followups,allow_received_time_followups,received_time_enabled_at
 INTO v_apply,v_allow_receipt,v_enabled_at
 FROM public.crm_tintim_observation_settings WHERE singleton=true;

 -- Configuracao dupla. Um administrador tem de homologar eventos reais e
 -- habilitar explicitamente a origem sem timestamp. Janela inicial de seguranca.
 IF coalesce(v_apply,false) AND coalesce(v_allow_receipt,false)
    AND v_enabled_at IS NOT NULL
    AND v_enabled_at <= now()-interval '5 minutes'
    AND p_occurred_at >= v_enabled_at
 THEN
   v_result:=public.crm_record_tintim_message(
     p_fingerprint,p_phone,p_direction,p_occurred_at,p_account_key);
   UPDATE public.crm_tintim_message_events e SET time_basis='webhook_received'
     WHERE e.fingerprint=p_fingerprint;
   RETURN v_result || jsonb_build_object('time_basis','webhook_received');
 END IF;

 -- Modo observacao: armazena SOMENTE telefone, direcao, hash do payload e
 -- horario de recebimento. Sem criar cliente, conversa, lembrete ou faturamento.
 INSERT INTO public.crm_tintim_message_events(
     fingerprint,phone_e164,direction,occurred_at,time_basis
 )
 VALUES(p_fingerprint,v_phone,p_direction,p_occurred_at,'webhook_received')
 ON CONFLICT(fingerprint) DO NOTHING RETURNING id INTO v_id;
 RETURN jsonb_build_object('accepted',true,
    'duplicate',v_id IS NULL,'mode','observe_only_received_time',
    'time_basis','webhook_received');
END; $fn$;

REVOKE ALL ON FUNCTION public.crm_record_tintim_message_v2(
 text,text,text,timestamptz,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_tintim_message_v2(
 text,text,text,timestamptz,text,text) TO service_role;
COMMIT;
