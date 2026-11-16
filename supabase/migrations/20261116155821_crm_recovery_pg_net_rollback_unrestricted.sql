-- Authorized rollback: installed extension ACLs could not be restricted by postgres.
-- No credentials or network requests were placed in the queue.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM net.http_request_queue) OR EXISTS(SELECT 1 FROM net._http_response)
 THEN RAISE EXCEPTION 'network_state_not_empty_review_required'; END IF;
END $$;
DROP EXTENSION pg_net RESTRICT;
COMMIT;
