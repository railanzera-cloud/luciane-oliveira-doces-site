-- Produção confirmada pelo gestor em 31/10/2026: 3 bolos x 8 fatias = 24 unidades.
-- Atualização de preparo do lote, sem iniciar vendas até publicação do frontend.
-- Não faz reset/alteração em reservas antigas.
UPDATE public.slice_preorder_batches b
SET capacity=24,updated_at=now()
WHERE b.item_key='slice_chocolate_morango'
  AND b.enabled=false
  AND b.capacity=0
  AND b.reserved_units=0
  AND b.external_reserved_units=0
  AND b.started_at >= '2026-10-31 00:00:00-03'::timestamptz
  AND b.started_at < '2026-11-01 00:00:00-03'::timestamptz
  AND b.ready_at='2026-10-31 12:00:00-03'::timestamptz;
