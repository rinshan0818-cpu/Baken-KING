# Phase 2: sharing DB migration (2026-11-03)

## Applied to production dedicated Neon database
- Project: `baken-king-sharing` / `wandering-art-06035802`
- Database: `baken_sharing`
- Table: `public.sharing_snapshots`
- Applied ADD COLUMN IF NOT EXISTS for `purchased_race_count`, `hit_race_count`, `settled_race_count` (nonnegative integer defaults 0) and nullable `max_payout_yen` (bigint).
- Added `bk_snapshot_race_numbers_check` and `bk_snapshot_max_payout_check` constraints in one transaction.
- Pre-migration: all four sharing tables had zero rows. No rows removed, no user wallet/bet data touched.
- Post-migration verified columns exist. All four sharing tables still have row-level security ENABLED and FORCED, with **zero policies**, so API data access remains intentionally blocked.

## Remaining work (not yet live)
1. Verify Managed Better Auth JWT claims, JWKS signature, issuer, audience and actual email-verification policy; current JWT verifier is not yet compatible by assumption.
2. Design restricted access with verified identity and least-privilege PostgreSQL permissions. No blanket public grants.
3. Implement profile registration, friend request, accept/reject, read friend-only summary and owner-only write, with authorization and transactional tests.
4. Deploy authenticated API, wire app login state and 30-minute friend-sync controller, test two iPhones.

Existing Baken-KING local betting and settlement remain unchanged. Manual comparison code remains the fallback.
