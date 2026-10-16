-- Controle de execucao RPC dos Copos Crocantes.
-- Supabase pode conceder EXECUTE diretamente a anon na criacao da funcao.
-- Restricao adicional: somente o contador agregado e publico.
begin;
revoke execute on function public.admin_get_crocante_inventory() from public, anon;
revoke execute on function public.admin_set_crocante_inventory(text,integer,bigint,boolean) from public, anon;
grant execute on function public.admin_get_crocante_inventory() to authenticated,service_role;
grant execute on function public.admin_set_crocante_inventory(text,integer,bigint,boolean) to authenticated,service_role;
-- Nao expor funcoes internas de gatilho ao PostgREST.
revoke execute on function public.lod_hold_crocante_on_item_insert() from public, anon,authenticated;
revoke execute on function public.lod_reconcile_crocante_on_order_status() from public, anon,authenticated;
-- Consulta anonima retorna somente saldo, sem dados pessoais ou reservas.
revoke execute on function public.public_crocante_inventory() from public;
grant execute on function public.public_crocante_inventory() to anon,authenticated,service_role;
commit;
