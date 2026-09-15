# k3rxsene's Services

A digital-services storefront for Roblox experiences: public service catalogues, service detail pages, wishlist, a protected INR pricing/checkout flow, a server-validated order endpoint, an international rate-request endpoint, a server-side Roblox OAuth handoff, and a local (on-device) account/orders view.

## Run locally
1. Copy `.env.example` to `.env` and fill in your own values (see below).
2. `npm start`
3. Open `http://localhost:3000`

All static assets now live in `public/`; `server.js` only serves files from that folder, so nothing outside it is ever reachable over HTTP.

## Before deploying — required
- Rotate the Roblox client secret and Discord webhook URL that were shared in chat. Anything pasted into an AI conversation should be treated as compromised.
- Set `INR_USERNAME`, `INR_PASSWORD`, `SESSION_SECRET` (32+ random chars).
- Set `DISCORD_WEBHOOK_URL` on the server only — never in client code. Blank = orders/quotes still validate and get a reference ID, just aren't delivered to Discord.
- Configure `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET` against your real Roblox OAuth app. The identity exchange must only return identity data after genuine Roblox verification.
- Set `APP_ORIGIN` and `NODE_ENV=production` for the OAuth callback and secure cookies.

## What this pass added
- **Service detail pages** (`/service.html?game=&id=`) with what's included / not included, requirements, fulfilment process, estimated completion time, related services, recently viewed, and Roblox connection status.
- **Site search** with recent/popular searches and live results across both catalogues.
- **Filtering & sorting** on catalogue pages (category, availability, price band for INR, popularity/price/name sort) with a mobile filter drawer.
- **Wishlist** and **recently viewed**, stored on-device (`localStorage`) — no account system exists server-side, so this is explicitly local, not cross-device.
- **`/account.html`**: Roblox connection status with a real disconnect/reconnect action (`POST /api/roblox/disconnect`), wishlist, and a local copy of recent orders/rate requests. Clearly labeled as device-local since there is no order database.
- **`/support.html`**: requirements, pricing, fulfilment-time, cancellation/refund and prohibited-request policies in one place, linked from checkout.
- **Order notes**: customers can add a note during order review; it's validated server-side and included in the Discord webhook payload.
- Cart selections now persist per game/market across navigation (`sessionStorage`), so opening a service page and coming back doesn't lose the cart.

## Roblox OAuth — preserved, lightly extended
The authorize → token → userinfo flow in `/api/roblox/start` and `/api/roblox/callback` is unchanged. Added `POST /api/roblox/disconnect`, which simply clears `session.roblox` server-side so a customer can connect a different account — no new external calls, no credential handling.

## Order & Discord webhook workflow — preserved, payload extended
`/api/orders` still independently revalidates every service ID, quantity (1–99 integers), and price/surcharge/total server-side; a failed Discord delivery still fails the whole order rather than falsely confirming it. Added: an optional, sanitized customer `notes` field is now accepted, stored on the order object, and included in the webhook message. The webhook URL and channel are never exposed to the client.

## On the "Account Credential Reset" catalog item
Per your direction this service was kept exactly as-is. To be transparent: nothing in this codebase collects, stores, or transmits a Roblox password anywhere — the item is a catalog line item like any other, and the checkout/order flow has no credential-collection field. If this service does involve handling a customer's in-game credentials in your actual fulfilment process (outside this codebase), that still carries the same account-security exposure regardless of website wording — worth keeping in mind operationally even though no code change is being forced here.

## Maintaining catalogues
Service rows live in `server.js` under `catalog` as `[id, name, description, price, tag, eta, featured]`. Nothing about pricing is computed or trusted client-side — the order, quote, and item-lookup endpoints independently read from this same source of truth.

## Known limitations (architecture-driven)
- There is no database, so "order history" is a local, device-only convenience, not a real account system. A returning customer on a new device/browser won't see past orders.
- No payment provider is integrated; checkout ends at a server-validated order record posted to Discord, not a charge. Wire in a real processor before accepting live payments.
- The INR (private pricing) login is a single shared username/password, not per-customer accounts — reconnecting Roblox and viewing local orders both work within that single shared session model.