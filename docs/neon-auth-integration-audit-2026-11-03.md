# Neon Auth integration audit (2026-11-03)

Status: **research and read-only audit complete; production sync NOT enabled**.

## Confirmed live settings
- Neon project: `baken-king-sharing` (`wandering-art-06035802`), branch `br-silent-snow-a1e3o1cq`, database `baken_sharing`.
- Managed Better Auth integration active at `https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth`.
- JWKS: `https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth/.well-known/jwks.json`.
- Trusted origin: `https://rinshan0818-cpu.github.io`.
- Email/password and sign-up enabled. Email verification is **not** required, in contrast to the current strict emailVerified check in `sharing-server/jwt-auth.cjs` and `sharing-server/service.cjs`.
- Public sharing tables have ENABLE and FORCE RLS but **zero RLS policies**. Database should stay inaccessible to client access until scoped policies and grants are reviewed.
- `sharing_snapshots` still has only `owner_id, schema_version, stake_yen, returned_yen, settled_ticket_count, updated_at`. The additive `docs/sharing-schema-v2.sql` migration has NOT been applied.

## Verified authentication behavior and integration gap
Neon Managed Better Auth uses an HTTP-only opaque session cookie; the SDK also retrieves a JWT `session.access_token` for authorized API use. Do not put the opaque cookie into the existing `Authorization: Bearer` JWT verifier. Obtain the SDK access token, then verify it with Neon's JWKS or use the Neon Data API's built-in JWT verification. **Do not accept a client supplied user ID or emailVerified flag**. Current custom JWT verifier pins a single RSA key and RS256 and requires issuer/audience/email_verified. Verify actual Neon token algorithm, issuer, audience and claim conventions before wiring it; do not assume the sample JWT in the docs matches the verifier.

Official sources:
- https://neon.com/docs/auth/authentication-flow
- https://neon.com/docs/data-api/get-started

## Safe next sequence
1. Decide email-verification policy: either enable and test email verification in Neon Auth, or revise verified-session requirements based on a deliberate product security choice. Maintain default-deny until done.
2. Integrate supported Neon browser SDK login / logout and obtain an authenticated access token. Keep the account UI separate from existing local horse-ticket state.
3. Use JWKS-backed token verification or Neon Data API, tied to actual Neon claims, and server-side identity. Test missing, expired, forged and cross-user tokens.
4. Introduce narrow authenticated GRANTs and explicit RLS policies; test own-write, friend-read and deny unrelated users. Avoid globally granting public schema table access.
5. Apply reviewed additive schema migration, then wire API routes and friend invitation/approval. Never migrate raw tickets, balance, race IDs or full settlement history to sharing DB.
6. Connect `friend-sync.js` (manual and in-app 30-minute check), test both real phones. PWA background execution is not guaranteed.
7. Preserve manual exchange codes for Nov 7–8 fallback.

## Safety boundary
Existing GitHub Pages origin, ticket purchase/settlement, localStorage and JRA result monitoring remain unchanged. This audit does not claim live auth, deployed API, successful CI, or completed sync.
