# k3rxsene's Services

Multi-page Roblox services site with public catalogues, protected INR pricing, a server-validated order endpoint, an international rate-request endpoint, and a server-side Roblox authentication handoff.

## Run locally
1. Copy `.env.example` to `.env` and fill in your own values.
2. `npm start`
3. Open `http://localhost:3000`

## Before deploying — required
- Rotate the Roblox client secret and Discord webhook URL that were shared in chat. Anything pasted into an AI conversation should be treated as compromised.
- Set `INR_USERNAME`, `INR_PASSWORD`, `SESSION_SECRET` (32+ random chars).
- Set `DISCORD_WEBHOOK_URL` on the server only — never in client code. Blank = orders/quotes still validate and get a reference ID, just aren't delivered to Discord.
- Configure `ROBLOX_AUTH_URL`, `ROBLOX_IDENTITY_EXCHANGE_URL`, `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET` against your real Roblox identity service. The exchange endpoint must only return identity data after genuine Roblox verification.
- Set `APP_ORIGIN` and `NODE_ENV=production` for the OAuth callback and secure cookies.

## What changed in this pass
- Added `/api/quotes`: a rate-limited, unauthenticated endpoint for international visitors to request a quote for specific services (no client-supplied prices are ever trusted — INR orders remain fully server-priced and validated as before).
- Public (non-INR) catalogue pages now let visitors add services and submit a rate request with a contact email, instead of dead-ending on "Price on request" with no action.
- Confirmed already in place from the prior review: integer-only quantities (1–99), a failed Discord delivery fails the whole order instead of falsely confirming it, and both catalogs include the higher-value fruits/pets/sprinklers.

## Open item worth your attention
The catalog still lists an "Account Credential Reset" service that implies handling a customer's Roblox login. That's both a Roblox ToS violation and a real account-theft risk on both sides of the transaction. I'd recommend removing it or replacing it with something that never touches credentials — happy to help rework it if you want to keep a version of that service.

## Maintaining catalogues
Service definitions and INR prices live in `server.js` under `catalog`. Nothing about pricing is computed or trusted client-side — the order and quote endpoints independently revalidate every service ID, quantity, and (for orders) price/surcharge/total.