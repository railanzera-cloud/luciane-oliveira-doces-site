-- A função é de trigger, não um endpoint RPC para clientes.
-- O ambiente produtivo concede EXECUTE a anon/authenticated por privilégios padrão.
REVOKE ALL ON FUNCTION public.lod_validate_drink_on_item_insert() FROM PUBLIC, anon, authenticated;
