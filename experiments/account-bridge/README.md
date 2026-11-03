# Production account bridge — isolated validation

This separately deployed Vercel project is for testing whether existing production Neon Auth accounts retain a session through a same-origin reverse proxy.

- URL: https://baken-king-account-bridge.vercel.app/
- Uses production Neon Auth (existing accounts) but does not call production sharing DB or modify friendships.
- Only `sign-in/email`, `get-session` and `sign-out` routes are allowed; **no registration or write operations to wagering data**.
- Successful login here does **not** log into the GitHub Pages PWA; browser origins are separate.
- Do not change GitHub Pages deployment/origin or uninstall the PWA, because wagering localStorage is not portable automatically.
- Proxy cookies stay HttpOnly, Secure, host-only and SameSite Lax. Request methods and host/origin are restricted; sensitive headers are not exposed to browser JS.
- To move toward production, retain the full PWA on its original origin until the user has successfully exported and validated a complete backup. After validation, test authenticated friend pages and API on the same Vercel origin before attempting any migration.
