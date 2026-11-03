# Baken-KING friend feature integration checkpoint — 2026-11-03

## App v5.73
- Added `friends.html`, linked from the Data tab, to manage a verified-email account's friend ID, own profile, invitations, accept/reject, revocation and friend score reads.
- The friend summary response is mapped to the existing nine-metric `baken-king-friend-score-v1` browser comparison cache (NO ticket, wallet or full backup data).
- Added `friend-cloud-sync.js` to the main PWA. Initial cloud publishing requires an explicit consent confirmation and a successful account/API check. Only seven primitive DB fields that derive the agreed nine displayed metrics are sent; the app never shares bet-by-bet records.
- Once a user has successfully opted in, manual sync and ~30-minute sync while the app is visible are enabled. Browser background execution is not guaranteed; no offline sync guarantee. No auth checks/network requests before opt-in on app startup.
- Test mode never runs cloud sync. Existing manual friend comparison codes remain operational.
- Automated privacy/syntax tests: `tests/friends-page.test.cjs`, `tests/friend-cloud-sync-consent.test.cjs`, updated friend store/HTTP tests. These are registered in `.github/workflows/ui-smoke.yml`. Do not claim the entire CI is green without checking.

## Real Neon isolated-branch RLS tests
- Branch `br-quiet-morning-a1lc4ifn`, NEVER main:
  - Own account profile insert/update works under RLS.
  - Pre-friend invite works when the recipient already has a registered profile (we removed recipient visibility subquery; FK validates ID).
  - Sender and recipient each read their pending request; third-party visibility is denied.
  - **Found and FIXED a serious issue:** acceptance via a data-modifying CTE with friend INSERT in one SQL statement fails PostgreSQL RLS snapshot checks. Now two sequential SQL queries execute inside the actor-bound transaction. Confirmed acceptance+friend insert works live.
- All five sharing tables contain zero fixture rows following rollback. Main still has no sharing RLS policies and no private backup table.
- **Neon Console/API role creation security finding:** role created via the Neon API `baken_sharing_runtime` was assigned BYPASSRLS/CREATEROLE (neon_superuser). NEVER use this role in Vercel. An attempted ALTER to strip BYPASSRLS was rejected. The staging branch contains this test-only role; handle cleanup with appropriate authorization.
- Instead, explicitly created `baken_sharing_limited` via SQL in staging: LOGIN, NOINHERIT, NOCREATEROLE, NOBYPASSRLS, PASSWORD NULL. Has no inherited table read access; membership to NOLOGIN `baken_sharing_api` allows `SET LOCAL ROLE`. Confirmed role switching and correct RLS role on staging. This limited role **cannot connect over password yet** because it has no password.
- `sharing-server/actor-transaction.cjs` now checks the real `session_user` is exactly `baken_sharing_limited` and lacks BYPASSRLS BEFORE switching to the restricted `baken_sharing_api` role, and then binds JWT actor inside the same transaction.
- `docs/sharing-restricted-role-staging.sql` documents the SQL-based role creation.
- Relevant Neon guidance: https://neon.com/docs/manage/roles and https://neon.com/docs/manage/database-access

## API deployment
- Vercel project `baken-king-sharing-api`, deployment `dpl_5BEBBk35N2gNinaM1J1dCKnCL8dv`, state **READY**, `https://baken-king-sharing-api.vercel.app`.
- The project has **zero configured environment variables** (verified). It is a fail-closed disabled shell, NOT a live API. A READY build does not prove authenticated runtime HTTP requests.
- Existing monitor bridge Vercel project is unchanged.

## Next steps (friend feature first)
1. Complete Neon Auth OTP email verification while safeguarding existing accounts. Current verification requirement is disabled; the API requires `emailVerified=true`.
2. Apply already tested RLS/policies in production after final review; create a new least-privileged LOGIN SQL role in production with a secret distributed ONLY to Vercel; validate end-to-end JWT authorization. Never use Neon-generated admin/BYPASSRLS credentials.
3. Validate two real logins: friend ID exchange, profile registration, invitation, approval, summary upload and read, revocation denial, and error paths.
4. After proving safe data flow, activate the API and the opt-in friend sync. Then return to full individual encrypted backup and restore work.
5. Keep the agreed nine displayed fields: profit, ROI, stake, payout, settled ticket count, purchased race count, hit race count, race hit rate, max payout.
