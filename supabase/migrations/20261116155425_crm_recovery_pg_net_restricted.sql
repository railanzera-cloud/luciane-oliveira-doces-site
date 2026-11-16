-- Authorized installation attempt. Managed-owner REVOKEs proved ineffective.
-- Follow-up migration 20261116155821 removed the extension before any credential/request.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN
  RAISE EXCEPTION 'pg_net_state_changed_review_required'; END IF;
END $$;
CREATE EXTENSION pg_net;
REVOKE ALL ON SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
