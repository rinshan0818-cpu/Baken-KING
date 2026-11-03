-- Baken-KING account-backed private backup storage (STAGING DRAFT ONLY).
-- NOT applied to production. Do not grant this table to Data API/browser roles.
-- This table is separate from nine-item friend summary sharing.
BEGIN;
CREATE TABLE IF NOT EXISTS public.sharing_private_backups (
 owner_id uuid PRIMARY KEY REFERENCES public.sharing_users(id) ON DELETE CASCADE,
 revision bigint NOT NULL DEFAULT 1 CHECK (revision>=1),
 iv bytea NOT NULL CHECK (octet_length(iv)=12),
 tag bytea NOT NULL CHECK (octet_length(tag)=16),
 ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) BETWEEN 1 AND 5000000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sharing_private_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_private_backups FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.sharing_private_backups TO baken_sharing_api;
CREATE POLICY bk_private_owner_read ON public.sharing_private_backups
 FOR SELECT TO baken_sharing_api USING(owner_id=public.bk_actor_id());
CREATE POLICY bk_private_owner_create ON public.sharing_private_backups
 FOR INSERT TO baken_sharing_api WITH CHECK(owner_id=public.bk_actor_id());
CREATE POLICY bk_private_owner_update ON public.sharing_private_backups
 FOR UPDATE TO baken_sharing_api
 USING(owner_id=public.bk_actor_id()) WITH CHECK(owner_id=public.bk_actor_id());
COMMIT;
-- Encrypt in private backend with AES-256-GCM and a 32-byte env key.
-- Never place encryption key in browser, Github, public Neon Data API or SQL.
-- No backup DELETE policy, no friend-read policy.
-- Test with real RLS role and rollback-safe fixtures before production.
