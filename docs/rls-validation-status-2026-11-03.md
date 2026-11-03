# RLS validation branch — 2026-11-03

Neon project `wandering-art-06035802`, isolated child branch `br-quiet-morning-a1lc4ifn` (`sharing-rls-validation-20261103`) from production main. This may consume Neon resources until cleaned up.

Applied the 21 non-BEGIN/COMMIT statements from `docs/sharing-rls-staging.sql` as one transaction to **the child branch only**. Twelve policies exist: 3 each on `sharing_users`, `sharing_requests`, `sharing_friendships`, and `sharing_snapshots`. Production main still has **zero policies**, confirmed independently.

**Important: NOT PASSED for production release.** A real restricted-role SELECT/INSERT/UPDATE/DELETE test was not possible with the present connector role. `SET LOCAL ROLE baken_sharing_api` returned `permission denied to set role "baken_sharing_api"`. No fabricated passing results. The role is NOLOGIN intentionally; an authorized test executor must be configured for isolated branch testing.

Before production:
- Verify RLS on the actual least-privilege API role using three test users and rollback-safe scenarios: own-write, non-owner denial, friend read only after accepted request, denied stranger, revoke, no actor context, no cross-user mutation.
- Resolve potential policy recursion and approval CTE/RLS visibility under real queries.
- Integrate the JWT verifier with real Neon Auth token claims, especially email verification (currently disabled in Neon settings, while API requires it).
- Scope each DB request to a transaction-local authenticated actor identity; review whether an owner/connection role can assume the API role. Never expose a DB connection string to GitHub Pages.
- Keep the 9 displayed friend metrics unchanged. None of the local ticket, wallet or settlement details belong in this DB.

As of this checkpoint, no friend APIs have been deployed, no cloud sync enabled, and main Baken-KING UI remains v5.70.
