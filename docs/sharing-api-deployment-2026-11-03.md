# Isolated Vercel sharing API — 2026-11-03

Created **new** Vercel project `baken-king-sharing-api`, project ID `prj_W0mgleSUlO7XslKYfHCMLUm1QBH7` under team `team_yTuge6Nog5oMiMjZk8NcSsUr`. Existing `baken-king-monitor-bridge` was not modified.

Deployed a minimal serverless bundle from GitHub files (14 files including `pg` dependency declaration) to deployment `dpl_GpdEoZzXTnVwJZuoVhyqFVSLhiuU`, alias `https://baken-king-sharing-api.vercel.app`. Vercel reports `READY`, build completed without fatal errors.

**IMPORTANT:** Although the deployment request specified preview, Vercel returned `target: production` and assigned a production alias. No private environment variables were supplied. `sharing-server/vercel-entry.cjs` refuses to start the API and responds with HTTP 503 unless ALL of these private settings exist: `SHARING_AUTH_PROVIDER=neon`, `SHARING_DATABASE_URL` for least-privileged restricted role, `SHARING_BACKUP_ENCRYPTION_KEY`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`. Therefore this deployment is a **disabled shell**, not a functioning service. Production DB was not altered, and no browser auto-sync was enabled.

Caution: `READY` only proves Vercel build/deployment, **not runtime HTTP 503**; an external HTTP check was inconclusive because the independent HTTP tooling could not access the deployment URL and Vercel Authentication may block anonymous requests. Verify actual HTTP function and CORS separately.

Before live activation:
1. Provision properly restricted database login role, or a safe server-only assumption mechanism (owner/BYPASSRLS is forbidden by `actor-transaction.cjs`).
2. Review data schema and RLS including profile/invitation edge cases; apply to production only after isolated RLS testing.
3. Complete Neon Auth email verification using OTP, ensure existing users can continue to sign in.
4. Configure encrypted Vercel environment variables without including them in GitHub or chat logs.
5. Validate real JWT and browser login state, 401/403/409, private backup round-trip, local import consent, and 30-minute sync before enabling the app-side transport.

Current main PWA version is v5.71. Remote ticket backup is not active. The previous local file backup remains available.
