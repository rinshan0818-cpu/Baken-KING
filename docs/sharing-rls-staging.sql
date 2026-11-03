-- Baken-KING sharing authorization plan (NOT APPLIED).
-- Review and test on a Neon test branch before production deployment.
--
-- Trust boundary: ONLY a private API server may hold the credential for
-- baken_sharing_api. This role MUST NEVER be used in GitHub Pages or Data API.
-- API must verify Neon Auth JWT (Ed25519/JWKS) AND verified email first.
-- The authenticated server runs each request in ONE transaction:
-- BEGIN; SELECT set_config('bk.actor_id', $1, true); SQL; COMMIT;
-- $1 must be taken solely from the verified JWT subject. With a transaction
-- pool the identity MUST be set afresh in every transaction.
--
-- IMPORTANT: custom PostgreSQL settings can be assigned by the DB role,
-- so this is not proof against a compromised server role. Never allow clients
-- direct SQL / Data API access to this role or permit arbitrary SQL from HTTP.
-- RLS is defense in depth behind a trusted authenticated server.

BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='baken_sharing_api') THEN
  CREATE ROLE baken_sharing_api NOLOGIN NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA public TO baken_sharing_api;
GRANT SELECT, INSERT, UPDATE ON public.sharing_users TO baken_sharing_api;
GRANT SELECT, INSERT, UPDATE ON public.sharing_requests TO baken_sharing_api;
GRANT SELECT, INSERT, DELETE ON public.sharing_friendships TO baken_sharing_api;
GRANT SELECT, INSERT, UPDATE ON public.sharing_snapshots TO baken_sharing_api;

-- Missing or invalid transaction-local actor means no rows are visible.
CREATE OR REPLACE FUNCTION public.bk_actor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER AS $$
 SELECT CASE
   WHEN current_setting('bk.actor_id', true) ~*
   '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   THEN current_setting('bk.actor_id', true)::uuid ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public.bk_actor_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bk_actor_id() TO baken_sharing_api;

CREATE POLICY bk_user_self_read ON public.sharing_users FOR SELECT TO baken_sharing_api
 USING (id=public.bk_actor_id()
    OR EXISTS (SELECT 1 FROM public.sharing_friendships f
     WHERE f.user_low=LEAST(id,public.bk_actor_id())
       AND f.user_high=GREATEST(id,public.bk_actor_id())));
CREATE POLICY bk_user_self_create ON public.sharing_users FOR INSERT TO baken_sharing_api
 WITH CHECK (id=public.bk_actor_id());
CREATE POLICY bk_user_self_update ON public.sharing_users FOR UPDATE TO baken_sharing_api
 USING (id=public.bk_actor_id()) WITH CHECK (id=public.bk_actor_id());

CREATE POLICY bk_request_parties_read ON public.sharing_requests FOR SELECT TO baken_sharing_api
 USING (sender_id=public.bk_actor_id() OR recipient_id=public.bk_actor_id());
CREATE POLICY bk_request_sender_create ON public.sharing_requests FOR INSERT TO baken_sharing_api
 WITH CHECK (sender_id=public.bk_actor_id() AND recipient_id<>public.bk_actor_id() AND status='pending');
CREATE POLICY bk_request_recipient_update ON public.sharing_requests FOR UPDATE TO baken_sharing_api
 USING (recipient_id=public.bk_actor_id() AND status='pending')
 WITH CHECK (recipient_id=public.bk_actor_id() AND status IN ('accepted','rejected'));

CREATE POLICY bk_friend_member_read ON public.sharing_friendships FOR SELECT TO baken_sharing_api
 USING (user_low=public.bk_actor_id() OR user_high=public.bk_actor_id());
-- Insertion is reserved for the accepted invitation transaction; the API
-- currently performs INSERT directly. This policy alone cannot establish
-- that both people consented. Before using this script, replace direct
-- friendship INSERT with a carefully scoped, atomic SECURITY DEFINER
-- function that validates the accepted request and its recipient.
-- Deliberately NO INSERT policy here; accepted links remain denied.
CREATE POLICY bk_friend_member_remove ON public.sharing_friendships FOR DELETE TO baken_sharing_api
 USING (user_low=public.bk_actor_id() OR user_high=public.bk_actor_id());

CREATE POLICY bk_snapshot_self_or_friend_read ON public.sharing_snapshots FOR SELECT TO baken_sharing_api
 USING (owner_id=public.bk_actor_id()
 OR EXISTS (SELECT 1 FROM public.sharing_friendships f
     WHERE f.user_low=LEAST(owner_id,public.bk_actor_id())
       AND f.user_high=GREATEST(owner_id,public.bk_actor_id())));
CREATE POLICY bk_snapshot_self_insert ON public.sharing_snapshots FOR INSERT TO baken_sharing_api
 WITH CHECK (owner_id=public.bk_actor_id());
CREATE POLICY bk_snapshot_self_update ON public.sharing_snapshots FOR UPDATE TO baken_sharing_api
 USING (owner_id=public.bk_actor_id()) WITH CHECK (owner_id=public.bk_actor_id());

COMMIT;
-- DO NOT RUN on production until invitation acceptance is redesigned for
-- narrow privilege and transaction tests prove self-write/friend-read
-- and stranger-denied behavior.
