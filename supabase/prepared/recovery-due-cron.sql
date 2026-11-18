-- RETIRED preparation. No pg_net/Vault job is used by the Cloudflare scheduler.
-- Kept as an explicit guard against accidentally applying the previous design.
DO $$ BEGIN RAISE EXCEPTION 'legacy_pg_net_scheduler_retired_use_cloudflare'; END $$;
