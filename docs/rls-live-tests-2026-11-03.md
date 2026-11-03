# Staging RLS live test results — 2026-11-03

Neon project `wandering-art-06035802`. **Non-production branch only:** `br-quiet-morning-a1lc4ifn`.

## Restricted-role testing completed
Granted `baken_sharing_api` role membership **to the staging branch database owner** to permit `SET LOCAL ROLE` for the test. This is not a production API credential. Tests ran under `current_user = baken_sharing_api`, with transaction-local `bk.actor_id`.

- Without actor context: `bk_actor_id()` returned null; snapshot visibility 0.
- Alice actor: saw her own summary (1).
- Stranger actor: saw Alice's summary as 0.
- Bob actor with previously accepted Alice→Bob invite: insert friend relationship succeeded and Bob could read Alice's summary (1).
- Stranger still saw 0 after friendship.
- Bob updating Alice's stake: `UPDATE ... RETURNING` returned 0 rows.
- Alice updating her own stake: `UPDATE ... RETURNING` returned value 200.

All sample rows were inserted under SAVEPOINT and rolled back using `ROLLBACK TO SAVEPOINT` before commit. Post-test row counts were **zero** in all four tables.

## Still outstanding
- **Not production-ready**: more exhaustive invite pending/reject/accept/revoke testing, RLS negative INSERT tests, auth JWT with real verified email, deployment/DB credential setup, and app client E2E are still needed.
- Current DB role is `NOLOGIN`. Production role assumption/credential workflow must be designed separately; never add privileged credentials to GitHub Pages.
- Main branch remained unaffected. Keep the nine established comparison items and local-only betting history.

See `docs/sharing-rls-staging.sql` for staged SQL policies.
