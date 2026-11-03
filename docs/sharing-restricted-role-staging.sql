-- Baken-KING restricted database login — REVIEW BEFORE PRODUCTION.
-- Applied manually ONLY on Neon isolated test branch 2026-11-03.
-- Do not create database roles via Neon Console/API for this use case:
-- Neon grants neon_superuser membership with BYPASSRLS to those roles.
-- Instead create a least-privileged SQL role.
--
-- No PASSWORD is set here. A private, generated strong password must be set
-- securely in the database and in Vercel's encrypted SHARING_DATABASE_URL
-- using a dedicated credential management workflow, NEVER in GitHub/code.
--
-- Only run after docs/sharing-rls-staging.sql has created baken_sharing_api.

BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='baken_sharing_limited') THEN
  CREATE ROLE baken_sharing_limited LOGIN NOCREATEDB NOCREATEROLE
   NOINHERIT NOBYPASSRLS PASSWORD NULL;
 END IF;
END $$;
GRANT CONNECT ON DATABASE baken_sharing TO baken_sharing_limited;
GRANT baken_sharing_api TO baken_sharing_limited;
COMMIT;

-- Verify BEFORE enabling:
-- SELECT rolcanlogin,rolinherit,rolcreaterole,rolbypassrls
-- FROM pg_roles WHERE rolname='baken_sharing_limited';
-- Expected: true,false,false,false.
--
-- Then logged in as this role (after private password provision):
-- BEGIN;
-- SET LOCAL ROLE baken_sharing_api;
-- SELECT current_user;              -- baken_sharing_api
-- SELECT set_config('bk.actor_id', '<JWT subject UUID>', true);
-- SELECT count(*) FROM sharing_snapshots; -- only self and accepted friends
-- ROLLBACK;
--
-- Production must not use a Neon-created admin role as SHARING_DATABASE_URL.
