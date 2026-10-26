-- Supabase CRM comercial: registrar somente metadados estruturais de event message_create.
-- 16 bits de presenca de chaves; NENHUM numero, nome, mensagem, token ou URL.
BEGIN;
CREATE TABLE public.crm_tintim_message_diagnostics (
  reason text NOT NULL
    CHECK(reason IN ('parsed','direction_missing','phone_missing',
      'timestamp_missing','timestamp_outside_window','invalid_payload','other')),
  field_flags text NOT NULL CHECK(field_flags ~ '^[01]{16}$'),
  count_events bigint NOT NULL DEFAULT 1 CHECK(count_events >= 1),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(reason,field_flags)
);
ALTER TABLE public.crm_tintim_message_diagnostics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_tintim_message_diagnostics FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.crm_record_tintim_message_diagnostic(
  p_reason text, p_field_flags text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
  END IF;
  IF p_reason NOT IN ('parsed','direction_missing','phone_missing',
    'timestamp_missing','timestamp_outside_window','invalid_payload','other')
    OR p_field_flags !~ '^[01]{16}$' THEN
    RAISE EXCEPTION 'crm_invalid_diagnostic' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.crm_tintim_message_diagnostics(reason,field_flags)
  VALUES(p_reason,p_field_flags)
  ON CONFLICT(reason,field_flags) DO UPDATE SET
    count_events=public.crm_tintim_message_diagnostics.count_events+1,
    last_seen_at=now();
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_record_tintim_message_diagnostic(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_tintim_message_diagnostic(text,text) TO service_role;

CREATE FUNCTION public.crm_tintim_message_diagnostic_summary()
RETURNS TABLE(reason text,field_flags text,events bigint,last_seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
  PERFORM public.crm_require_staff();
  RETURN QUERY SELECT d.reason,d.field_flags,d.count_events,d.last_seen_at
    FROM public.crm_tintim_message_diagnostics d
    ORDER BY d.count_events DESC,d.last_seen_at DESC LIMIT 30;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_tintim_message_diagnostic_summary()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_tintim_message_diagnostic_summary() TO authenticated;
COMMIT;
