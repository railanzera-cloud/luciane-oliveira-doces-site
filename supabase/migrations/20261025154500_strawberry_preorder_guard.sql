-- Proteção adicional: impedir reabrir o estoque imediato enquanto há pré-reservas ativas.
-- Estoque continua sold_out na tabela operacional. A vitrine nova detecta pré-reserva via RPC.
CREATE OR REPLACE FUNCTION public.lod_guard_strawberry_preorder_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
BEGIN
 IF NEW.item_key='slice_chocolate_morango'
   AND NEW.status='available'::public.item_status
   AND OLD.status IS DISTINCT FROM NEW.status
   AND EXISTS(SELECT 1 FROM public.slice_preorder_batches b
     WHERE b.item_key=NEW.item_key AND b.enabled=true) THEN
   RAISE EXCEPTION USING errcode='P0001',message='slice_preorder_active';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lod_guard_strawberry_preorder_availability() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_lod_strawberry_preorder_availability ON public.menu_availability;
CREATE TRIGGER trg_lod_strawberry_preorder_availability
BEFORE UPDATE OF status ON public.menu_availability
FOR EACH ROW EXECUTE FUNCTION public.lod_guard_strawberry_preorder_availability();
