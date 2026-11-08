-- Recuperação de comanda presa em "printing" com decisão humana.
-- Não modifica nenhum job existente durante a migração.
-- A impressão física nunca é inferida de WebSocket/QZ/HTTP.
CREATE TABLE IF NOT EXISTS public.kitchen_print_recovery_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_job_id uuid NOT NULL REFERENCES public.print_jobs(id),
  order_uuid uuid NOT NULL REFERENCES public.orders(id),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('paper_confirmed', 'retry_no_paper')),
  new_job_id uuid REFERENCES public.print_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kitchen_print_recovery_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kitchen_print_recovery_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.kitchen_print_recovery_audit_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_recover_stalled_print_job(
  p_job_id uuid,
  p_action text,
  p_acknowledgement text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := public.lod_require_authenticated_staff();
  v_job public.print_jobs%rowtype;
  v_order public.orders%rowtype;
  v_new public.print_jobs%rowtype;
  v_confirmation text;
BEGIN
  IF p_job_id IS NULL OR p_action NOT IN ('paper_confirmed', 'retry_no_paper') THEN
    RAISE EXCEPTION USING errcode='22023', message='invalid_recovery_action';
  END IF;
  v_confirmation := CASE p_action
    WHEN 'paper_confirmed' THEN 'CONFIRMO_QUE_O_PAPEL_SAIU'
    ELSE 'CONFIRMO_QUE_O_PAPEL_NAO_SAIU'
  END;
  IF p_acknowledgement IS DISTINCT FROM v_confirmation THEN
    RAISE EXCEPTION USING errcode='22023', message='physical_print_confirmation_required';
  END IF;

  -- Lock e CAS: o mesmo job não pode ser resolvido duas vezes em concorrência.
  SELECT * INTO v_job FROM public.print_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode='P0002', message='print_job_not_found';
  END IF;
  IF v_job.status <> 'printing'
      OR v_job.claimed_at IS NULL
      OR v_job.claimed_at > now() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION USING errcode='P0001', message='print_job_not_stale_or_already_resolved';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=v_job.order_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode='P0002', message='order_not_found';
  END IF;

  IF p_action='retry_no_paper' THEN
    -- Não gerar duas comandas simultaneamente para o mesmo pedido.
    IF EXISTS (
      SELECT 1 FROM public.print_jobs
      WHERE order_uuid=v_order.id AND id<>v_job.id
        AND status IN ('pending','printing')
    ) THEN
      RAISE EXCEPTION USING errcode='23505', message='another_active_print_job_exists';
    END IF;
    -- Respeitar integralmente as regras operacionais já aplicadas em claim_print_job.
    IF NOT EXISTS (
      SELECT 1 FROM public.kitchen_print_control c
      WHERE c.control_id=true AND c.enabled=true
        AND v_order.created_at>=c.accept_new_after
    ) OR NOT public.lod_kitchen_print_eligible(v_order) THEN
      RAISE EXCEPTION USING errcode='22023', message='order_not_eligible_for_manual_recovery';
    END IF;

    -- Cancelar somente a TAREFA abandonada, jamais o pedido ou o pagamento.
    -- Invalidar o token antigo impede confirmação tardia no banco.
    UPDATE public.print_jobs
       SET status='cancelled', claim_token=NULL,
           last_error='Recuperação manual: papel não saiu; tarefa anterior encerrada.'
     WHERE id=v_job.id AND status='printing';

    -- kind=initial é intencional: claim_print_job hoje aceita reprint somente
    -- quando já existe uma impressão initial marcada printed. O caso real #1700
    -- não tem initial printed; nova tarefa initial é reconhecida pelas regras
    -- existentes, sem afrouxar autorização de reprints.
    INSERT INTO public.print_jobs(order_uuid,job_key,kind,requested_by)
    VALUES (v_order.id, 'recovery:' || v_job.id::text, 'initial', v_actor)
    RETURNING * INTO v_new;
  ELSE
    -- O operador confirmou que VIU o papel. Não afirmar que QZ provou a saída.
    UPDATE public.print_jobs
       SET status='printed', printed_at=now(), claim_token=NULL,
           last_error='Saída física do papel confirmada manualmente pela equipe.'
     WHERE id=v_job.id AND status='printing';
  END IF;

  INSERT INTO public.kitchen_print_recovery_audit
      (source_job_id,order_uuid,actor_id,action,new_job_id)
  VALUES (v_job.id,v_order.id,v_actor,p_action,v_new.id);

  RETURN jsonb_build_object(
    'order_number',v_order.order_number,
    'source_job_id',v_job.id,
    'action',p_action,
    'new_job_id',v_new.id,
    'result',CASE WHEN p_action='retry_no_paper' THEN 'pending_new_job' ELSE 'confirmed_manually' END
  );
END
$function$;

REVOKE ALL ON FUNCTION public.admin_recover_stalled_print_job(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_recover_stalled_print_job(uuid,text,text) TO authenticated;

COMMENT ON FUNCTION public.admin_recover_stalled_print_job(uuid,text,text) IS
'Recupera trabalho printing abandonado há mais de 5 minutos, sob confirmação física, lock transacional e auditoria. Não confirma pagamentos nem imprime automaticamente por si.';

