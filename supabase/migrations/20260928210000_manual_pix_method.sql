-- Separate migration: PostgreSQL must commit the enum before its use.
alter type public.lod_payment_method add value if not exists 'manual_pix';
