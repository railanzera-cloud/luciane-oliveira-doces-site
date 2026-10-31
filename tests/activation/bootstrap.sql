-- SYNTHETIC, LOOPBACK-ONLY TEST DATABASE. Never execute against the commercial project.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'synthetic_ci_only';
GRANT anon,authenticated,service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
CREATE TABLE tintim_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone_digits text,contact_name text,
 source_label text,stage_label text,ad_name text,campaign_name text,
 last_observed_at timestamptz DEFAULT now()
);
CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_phone text,
 payment_status text,order_status text,created_at timestamptz DEFAULT now());
CREATE TABLE tintim_order_links(conversation_id uuid,order_uuid uuid,status text);
