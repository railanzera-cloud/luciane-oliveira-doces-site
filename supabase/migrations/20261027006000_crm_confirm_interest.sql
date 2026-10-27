-- LOD comercial: registrar preferência confirmada por atendente sem criar lembrete.
-- O sinal da mensagem/Ads permanece separado do produto confirmado.
BEGIN;
CREATE FUNCTION public.crm_confirm_interest(
 p_conversation_id uuid,
 p_interest text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_label text:=nullif(btrim(regexp_replace(coalesce(p_interest,''),'\s+',' ','g')),'');
 v_status text;
 v_previous text;
BEGIN
 PERFORM public.crm_require_staff();
 IF p_conversation_id IS NULL
    OR v_label IS NULL
    OR char_length(v_label)<2
    OR char_length(v_label)>80
    OR v_label ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'crm_invalid_interest' USING ERRCODE='22023'; END IF;
 SELECT status,interest_label INTO v_status,v_previous
 FROM public.crm_conversations WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'crm_conversation_not_found' USING ERRCODE='22023';
 END IF;
 IF v_status IN ('converted','closed','lost') THEN
   RAISE EXCEPTION 'crm_not_eligible' USING ERRCODE='42501';
 END IF;
 IF v_previous IS DISTINCT FROM v_label THEN
   UPDATE public.crm_conversations
     SET interest_label=v_label,interest_basis='staff_confirmed',updated_at=now()
   WHERE id=p_conversation_id;
   INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
   VALUES(p_conversation_id,'interest_confirmed','admin',
     'Produto informado e confirmado pela equipe');
 END IF;
 RETURN jsonb_build_object(
    'saved',true,
    'changed',v_previous IS DISTINCT FROM v_label,
    'basis','staff_confirmed'
 );
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_confirm_interest(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_confirm_interest(uuid,text) TO authenticated;
COMMIT;
