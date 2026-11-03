# Baken-KING PWA authentication probe (isolated)

- Deployment project: `baken-king-auth-probe` on Vercel
- URL: `https://baken-king-auth-probe.vercel.app/`
- Uses **staging Neon Auth** at `ep-broad-sun-a1lsiagr` and NOT production Neon Auth.
- The existing Baken-KING app, production JWT verifier, sharing database, race-monitor API and local wager data are not modified by this experiment.
- Do NOT enter any existing production account credentials here. Create a separate throwaway staging account only for this authentication experiment.
- Goal: check whether a same-origin server-side proxy can persist an HttpOnly session cookie on iOS Safari/PWA. This is NOT a completed account migration.
- In particular, a successful login on the standalone Vercel probe cannot prove Safari/PWA login works after migrating the full Baken-KING app; that needs a separate same-origin PWA test.
- No browser session token should be stored in localStorage. Server cookies must be Secure, HttpOnly, host-only and SameSite=Lax.
- No wagers, balance, settlement history or friend data are sent.
- No migration of the GitHub Pages app or existing `keiba-demo-v1` localStorage until the user has exported and verified a restoreable backup.
