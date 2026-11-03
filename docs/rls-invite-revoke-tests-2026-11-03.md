# Sharing RLS invitation and revocation checks — 2026-11-03

Non-production Neon branch: `br-quiet-morning-a1lc4ifn` of `wandering-art-06035802`.

Executed actual SQL via `SET LOCAL ROLE baken_sharing_api` and `set_config('bk.actor_id', actor_uuid, true)`. Fixture users Alice, Bob, Stranger were created in a SAVEPOINT and removed by `ROLLBACK TO SAVEPOINT` in the same transaction.

Observed:
- Alice sender updating Bob's pending request to accepted: **0 rows**.
- Bob recipient rejecting his pending request: returned `status='rejected'`.
- Stranger viewing invitation: count **0**.
- Bob recipient accepting pending request: returned `status='accepted'`.
- Bob inserting friendship for the just-accepted invitation: returned the friendship row.
- Stranger viewing friendship: count **0**.
- Stranger deleting Alice/Bob friendship: **0 rows**.
- Bob deleting Alice/Bob friendship: returned the deleted friendship row.
- Follow-up DB table counts: all four sharing tables **0**.

These are isolated RLS checks, NOT evidence that live JWT verification, email confirmation, API deployment, browser cookie behavior, or two-phone sync already works. The production Neon main branch remains unchanged.

Further risk to address before deployment: actual friendship SQL CTE approval/insert must operate under RLS in the same statement; verify transaction-local actor per connection; configure verified email and restricted API DB credentials.
