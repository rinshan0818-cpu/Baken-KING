# Sharing API production setup — 2026-11-03

## Current status
- App UI version: **v5.75** (unchanged in this deployment).
- Independent Vercel project: `baken-king-sharing-api` (`prj_W0mgleSUlO7XslKYfHCMLUm1QBH7`).
- Latest serverless deployment: `dpl_GAUgKayqU1yseZgKKm1fCCBi5skG` — Vercel reports **READY**.
- Alias: `https://baken-king-sharing-api.vercel.app`.
- Vercel SSO protects **preview** deployments; production access uses application-level signed Neon Auth JWT verification.
- Production env values set (values NOT stored in Git): `SHARING_AUTH_PROVIDER`, `SHARING_DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`. Personal backup encryption key is **not** configured; personal backup API remains off.

## PostgreSQL production controls
- Production branch: `br-silent-snow-a1e3o1cq` / DB `baken_sharing`.
- Four sharing tables have FORCE RLS enabled, with **12 policies** applied on production after branch validation.
- Role `baken_sharing_api`: NOLOGIN, NOBYPASSRLS.
- Role `baken_sharing_limited`: LOGIN, NOINHERIT, NOBYPASSRLS, NOCREATEROLE.
- Runtime connection uses a dedicated high-entropy password stored only in Postgres and Vercel encrypted env (not in source code).
- `actor-transaction.cjs` rejects a privileged `session_user`; it checks `baken_sharing_limited` and `rolbypassrls=false`, then sets transaction-local `baken_sharing_api` and verified actor UUID.
- Production rollback-only transaction test: user A and B profiles, invitation, recipient acceptance, and friendship insert **all passed**. Fixtures were rolled back; no test users/friends persisted.

## Diagnostics
- `GET /api/sharing/health` returns `{ok:true,status:"db-connected"}` only if the Vercel function can connect with the dedicated restricted login role. Never reports credentials or personal data.
- An HTTP client outside Vercel could not access the new URL from the present execution environment. **Runtime health response has NOT yet been verified**; READY only proves successful deployment.
- All real friend endpoints require verified signed JWT and remain inaccessible if Neon Auth reports `emailVerified:false`.

## Outstanding blockers / checks
1. **Neon Auth email verification is still disabled** in the production auth configuration, although email OTP is selected. Do not relax server verification. Enable first-time email OTP carefully, accounting for existing signed-up users; test the auth page and 15-minute JWT retrieval. The available Neon connector's update-auth-config tool does not expose email verification parameters.
2. Open `https://baken-king-sharing-api.vercel.app/api/sharing/health` and confirm `db-connected`; investigate any 503 in Vercel runtime logs.
3. Test verified account A → profile registration → request account B's shared UUID → B approval → both publish exact nine comparison metrics → compare → revoke.
4. Confirm iPhone Safari session persistence and manual/30-minute sync behavior. The current comparison app has no cloud personal-backup activation.

Never include secrets or user emails in logs/screenshots. No changes were made to the existing horse racing result monitor or local wager data.
