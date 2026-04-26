# HD Xquisite Liquors

Premium liquor delivery web app for HD Xquisite Liquors. Customers browse products, place orders, and pay via PayPal or cash-on-delivery (COD); merchants manage orders, per-location inventory, and a public Events page.

## Stack

- **Frontend** (`web/`): React 18 + Vite + TypeScript + Tailwind, react-router-dom v6, Supabase JS client (auth + realtime).
- **Backend** (`server/`): Express + TypeScript, bundled by esbuild to `server_dist/`. Talks to Supabase via the service-role key for admin-only mutations.
- **Database / Auth / Realtime**: Supabase (Postgres + RLS + auth + realtime channels). SQL migrations live at the project root (`supabase-*.sql`).
- **Payments**: PayPal SDK (server-side capture) + COD.

## Workflows

A single `Start application` workflow runs both server and web:

```
npm run server:build && PORT=3001 node server_dist/index.js & \
  cd web && npm install --legacy-peer-deps && npx vite --host 0.0.0.0 --port 5000
```

- **Backend** on `:3001` — serves `/api/*`.
- **Web** on `:5000` — Vite dev server (this is the URL the user previews).
- Vite proxies `/api/*` → `http://localhost:3001`.

The two `Start Backend` and `Start Frontend` workflow names are placeholders that point at the unified `Start application` workflow.

## Auth & Admin

- Auth uses Supabase JWTs. Customer accounts can sign up freely.
- Admin access is granted by setting `app_metadata.role = 'admin'` (or `'location_admin'`) on a user via Supabase. See `supabase-admin-migration.sql`.
- `AdminGuard.tsx` calls `GET /api/admin/me` and renders the admin dashboard only when the server confirms the role from the JWT.

## Features

### Storefront

- Product catalog (`/`, `/search`, `/products/:id`), checkout (`/checkout`), order tracking, payment success/failed/cancelled pages.

### Per-Location Inventory

- Inventory is tracked per location (`inventory` table keyed by `(product_id, location_id)`).
- Atomic stock decrement on order paid (`stock_decremented_at` is idempotent so retries don't double-decrement).
- Admin UI: big color-coded numbers, ± buttons, Out-of-Stock toggle, location banner.

### Events

- Public Events list (`/events`) and detail (`/events/:id`) with realtime updates, Add-to-Calendar (.ics) and Get-Directions (Google Maps) CTAs.
- Schema in `supabase-events-migration.sql`.

### Admin QR Code (`/admin/qr-code`)

- Admin tab that generates a scannable QR code pointing at the live customer site.
- Default destination is `window.location.origin`; merchant can edit (e.g. point at `/events` for a campaign).
- Two download formats:
  - **Poster** (1080×1500) with "SCAN TO ORDER" headline, white QR card with gold border, and HD Xquisite Liquors brand chrome — drop straight onto a flyer/sticker/social post.
  - **QR-only** (1024×1024) plain QR for compositing in Canva/Photoshop.
- Both PNG (raster) and SVG (vector) for each format. Use SVG for prints larger than ~8".
- QR uses standard black-on-white modules (with gold border around the white card) for maximum scanner compatibility — gold-on-black QR was tried first but some Android scanners reject inverted QRs. The poster around the card preserves the premium black/gold identity.
- Error correction `H` (30% damage tolerance) + 2-module quiet zone for robust scanning even on stickers / glossy flyers.
- Code: `web/src/pages/admin/QRCodePage.tsx`. Wired in `web/src/App.tsx` and `web/src/pages/admin/AdminTabs.tsx`.

## Important Files

```
web/src/
  App.tsx                          # routes (incl. /admin/* behind AdminGuard)
  context/AuthContext.tsx          # Supabase auth provider
  pages/
    Home.tsx, Search.tsx, ProductDetail.tsx, Checkout.tsx
    Events.tsx, EventDetail.tsx
    PaymentSuccess.tsx, PaymentFailed.tsx, PaymentCancelled.tsx
    admin/
      AdminGuard.tsx               # gate via /api/admin/me
      AdminTabs.tsx                # sub-nav: Orders / Inventory / Low Stock / Completed / QR Code
      AdminDashboard.tsx           # orders board
      InventoryPage.tsx            # per-location inventory editor
      QRCodePage.tsx               # NEW — QR poster generator

server/
  index.ts, auth.ts, routes.ts, paypal.ts

supabase-schema.sql                # core schema + RLS
supabase-admin-migration.sql       # admin role promotion helpers
supabase-events-migration.sql      # events table + RLS
```

## Dev Notes

- `web/` is its own npm package with its own `node_modules`. Add web dependencies via `web/package.json` (the workflow runs `cd web && npm install --legacy-peer-deps` on each start).
- `qrcode` + `@types/qrcode` are required for `/admin/qr-code`.
- React Router v6 future-flag warnings in the console are harmless.

## User Preferences

- Premium black/gold visual identity throughout the merchant UI (palette: gold `#E4A12B`, gold-dark `#9B6F1A`, ink `#0A0A0F`, serif headlines via Georgia / Playfair Display).
