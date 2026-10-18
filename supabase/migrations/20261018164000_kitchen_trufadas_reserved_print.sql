-- Correção da cozinha: pedido WhatsApp com Pix manual ainda pendente
-- pode emitir comanda de Pipoca Trufada COM reserva de estoque válida.
-- Esta mudança NÃO confirma pagamentos, NÃO movimenta estoque,
-- NÃO cria nem reimprime jobs e NÃO libera pedidos cancelados/estornados.
--
-- A antiga regra exigia sempre state='committed'; no Pix manual pendente
-- a reserva permanece 'held' até conferência, logo a fila jamais a reclamava.
-- O opt-in do Modo Cozinha permite 'held' APENAS dentro da reserva e do
-- período de ativação. A quantidade deve cobrir todos os itens daquele sabor.
CREATE OR REPLACE FUNCTION public.lod_crocante_print_allocation_ready(p_order_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM (
      SELECT i.item_key, SUM(i.quantity)::bigint AS needed
      FROM public.order_items i
      JOIN public.orders o ON o.id = i.order_uuid
      JOIN public.crocante_inventory inv ON inv.item_key = i.item_key
      WHERE i.order_uuid = p_order_uuid
        AND o.created_at >= inv.installed_at
      GROUP BY i.item_key
    ) r
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.crocante_inventory_holds h
      WHERE h.order_uuid = p_order_uuid
        AND h.item_key = r.item_key
        AND (
          -- Pagamento já aprovado / estoque definitivamente comprometido:
          -- preservar a elegibilidade histórica e demais fluxos existentes.
          h.state = 'committed'
          OR
          (
            h.state = 'held'
            AND h.quantity >= r.needed
            AND h.expires_at > now()
            AND EXISTS (
              SELECT 1
              FROM public.orders o
              JOIN public.kitchen_print_control ctl ON ctl.control_id = true
              WHERE o.id = p_order_uuid
                AND o.sales_channel = 'whatsapp'
                AND o.payment_method IN ('manual_pix','cash','card_on_delivery')
                AND o.payment_status = 'pending'
                AND o.order_status IN ('confirmed','preparing','ready',
                                       'ready_for_pickup','out_for_delivery')
                AND ctl.enabled = true
                AND ctl.auto_mode_enabled = true
                AND ctl.auto_mode_started_at IS NOT NULL
                AND o.created_at >= ctl.auto_mode_started_at
                AND o.created_at >= ctl.accept_new_after
            )
          )
        )
    )
  );
$function$;

-- Não modificar GRANT/REVOKE neste hotfix; preservar privilégios existentes.
COMMENT ON FUNCTION public.lod_crocante_print_allocation_ready(uuid)
  IS 'Libera impressão de Trufadas já comprometidas ou reservadas e vigentes no opt-in automático do WhatsApp, sem confirmar pagamentos.';
