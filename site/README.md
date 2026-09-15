# k3rxsene's Services

A single-vendor digital-services storefront for Roblox experiences: public service catalogues, service detail pages with genuine order-verified reviews, wishlist, a protected INR pricing/checkout flow, a server-validated order endpoint with real (server-persisted) order-status tracking, a support/refund-request flow, an international rate-request endpoint, a server-side Roblox OAuth handoff, and an account view that behaves sensibly at every authentication state.

## Run locally
1. Copy `.env.example` to `.env` and fill in your own values.
2. `npm start`
3. Open `http://localhost:3000`

All static assets live in `public/`; `server.js` only serves files from that folder, so nothing outside it is ever reachable over HTTP.

## Before deploying — required
- Rotate the Roblox client secret and Discord webhook URL that were shared in chat. Anything pasted into an AI conversation should be treated as compromised.
- Set `INR_USERNAME`, `INR_PASSWORD`, `SESSION_SECRET` (32+ random chars).
- Set `DISCORD_WEBHOOK_URL` on the server only — never in client code. Blank = orders/quotes/support requests still validate and get a reference ID, just aren't delivered to Discord.
- Configure `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET` against your real Roblox OAuth app.
- Set `APP_ORIGIN` and `NODE_ENV=production` for the OAuth callback and secure cookies.
- Optionally set `STAFF_TOKEN` if you want the internal `/api/staff/*` endpoints enabled (they 401 without it — see below).
- See `.env.example` for the full list, including the two variables that are new in this pass (`STAFF_TOKEN`, `DATA_DIR`) — every previously-existing variable is unchanged.

## What this pass changed, and why

**One visual identity everywhere — no per-game re-theming.** Catalogue and service-detail pages used to swap `--accent`/`--accent2` per game (a green "garden" skin, an orange "bloxfruits" skin) via `body.garden` / `body.bloxfruits` CSS classes. That's removed: every page now renders in the same old_index blue/cyan identity, and the JS no longer sets a per-game body class. Game and category distinction is now carried entirely by icons, tags and badges, not re-theming. The homepage hero itself was left structurally untouched.

**Order status is now real, not device-only.** Orders were previously only echoed into `localStorage` on the device that placed them — there was no way to check status from another device, and "status" never actually changed. `server.js` now persists every submitted order (id, items, total, connected Roblox user ID, status, status history) to a small JSON file under `DATA_DIR` (defaults to `./data`). `GET /api/orders/mine` returns the signed-in Roblox account's own orders with live status (`received → in_progress → completed`, plus `needs_info` / `cancelled` / `refunded`), and Your account → Recent orders now shows a real status tracker for these alongside any older device-local rate requests. This is still not a full database-backed multi-admin system — see Known limitations below.

**Genuine, order-verified reviews.** Service detail pages now show an honest empty state ("no reviews yet") when nothing exists — no seeded or fabricated ratings anywhere. A signed-in customer can leave a review by entering the order reference it's for; the server checks that the order belongs to their connected Roblox account, that it's marked `completed`, and that the service being reviewed was actually part of that order, before accepting it (`POST /api/reviews`). Aggregate rating + count show on catalogue cards and the service detail page (`GET /api/reviews/summary`) and are simply omitted when a service has no reviews yet.

**Support / refund requests are a real flow, not just a paragraph of policy text.** `/support.html` now has a working request form (order/quote reference, reason, details, desired outcome) that creates a ticket server-side (`POST /api/support`, reference like `SR-XXXXXXXX`) and a status lookup (`GET /api/support/lookup`) gated by ticket ID + the email used to submit it. Tickets move `submitted → under_review → resolved` via the internal staff endpoint below.

**Internal staff tooling, genuinely walled off.** `/api/staff/orders`, `/api/staff/orders/:id/status`, `/api/staff/tickets`, and `/api/staff/tickets/:id/status` require an `x-staff-token` header matching `STAFF_TOKEN`. Nothing in the customer-facing `app.js` ever calls these — they exist for the vendor's own team to operate against directly (a script, Postman, an internal dashboard you build separately), which keeps fulfillment tooling unreachable from any customer session regardless of order history.

## Roblox OAuth — unchanged
The authorize → token → userinfo flow in `/api/roblox/start` and `/api/roblox/callback`, and `POST /api/roblox/disconnect`, are unchanged from the previous pass: no password is ever requested, tokens never reach the browser, and only username/display name/user ID are stored in the session.

## Order & Discord webhook workflow
`/api/orders` still independently revalidates every service ID, quantity (1–99 integers), and price/surcharge/total server-side. If Discord delivery fails, the order is now marked `needs_info` (rather than silently succeeding) so it surfaces as needing attention instead of vanishing.

## Maintaining catalogues
Unchanged: service rows live in `server.js` under `catalog` as `[id, name, description, price, tag, eta, featured]`. Nothing about pricing is computed or trusted client-side.

## Known limitations (architecture-driven, still true)
- There is still no real relational database — orders, reviews and support tickets are flat JSON files under `DATA_DIR`. This is enough to make status tracking, reviews and ticket lookup genuinely live rather than device-local, but it is not a substitute for a production datastore at real scale (no concurrent-write locking, no indexing, no backups configured here).
- The INR (private pricing) login is still a single shared username/password, not per-customer accounts.
- No payment provider is integrated; checkout still ends at a server-validated order record, not a charge.
- The internal staff endpoints are intentionally API-only in this pass — a proper internal dashboard UI for staff was out of scope here and would be a separate, non-public app.

## Not fully addressed from the "single-vendor storefront" brief
The brief in this conversation was very large (38 sections). This pass focused on the highest-leverage, concretely checkable items: removing per-page re-theming, making order status/reviews/support genuinely server-backed instead of device-local mockups, and keeping the Account section honest at every auth state. Sections not substantially touched this pass, so you know where to look next: in-app/email notifications beyond what a completed order/ticket produces via Discord; a full accessibility audit (existing focus states, ARIA labels and skip links were kept but not re-audited end to end); a dedicated staff dashboard UI; and payment-provider integration.
