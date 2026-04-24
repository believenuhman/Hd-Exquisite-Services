# HD Xquisite Liquors

A premium liquor delivery web app (React + Vite + Tailwind) built for Median web wrapping. The Vite web app is the primary runtime.

## Architecture

- **Web App (Vite)**: React + Vite + Tailwind CSS, mobile-first design — port 5000 (`web/`) — PRIMARY APP (Replit Preview)
- **Backend (Express)**: Payment API + static file serving — port 3001 (dev), PORT env var (prod)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with localStorage session persistence
- **State**: React Context (CartContext, AuthContext, AgeGateContext, AppSettingsContext) — all memoized
- **Fonts**: PlayfairDisplay (headings) + CormorantGaramond (body) + Inter (UI/product cards)
- **Payments**: PayPal Orders API (primary online payment); Cash on Delivery always available

## Web App (`web/`)

- **Entry**: `web/src/main.tsx` — max-width 480px mobile-first layout
- **Router**: React Router DOM v6
- **Styling**: Tailwind CSS with custom font/color tokens + inline `index.css` animations
- **Build**: Vite 5 — `cd web && npm run build` produces `web/dist/`
- **PWA**: `web/public/manifest.json` + icons — enables "Add to Home Screen" on mobile
- **Workflow**: "Start application" (combined — Vite webview on port 5000, Express backend on port 3001)
- **Pages**: AgeGate → Welcome → Login/Signup/ForgotPassword → Home → Search → ProductDetail → Cart → Checkout → Profile → Orders → OrderTracking → Settings → ContactSupport → **PaymentSuccess** → **PaymentFailed** → **PaymentCancelled**
- **Components**: SplashScreen, BottomNav (5 tabs), DrawerMenu, ProductCard, ErrorBoundary

## REQUIRED: Run These Migrations Before Going Live

All SQL files in the project root **must be applied** in Supabase before their associated features work. Code degrades gracefully without them, but features stay disabled.

1. `supabase-payment-migration.sql` — payment columns on `orders`. Required for the basic checkout / PayPal flow.
2. `supabase-membership-coupon-migration.sql` — `user_memberships`, `coupons`, `coupon_redemptions` tables + membership/coupon snapshot columns on `orders`. Required for the membership tier system and coupon codes.
3. `supabase-admin-migration.sql` — expands `orders.status` check constraint (adds `confirmed`, `ready_for_pickup`) and adds `orders` + `order_items` to the `supabase_realtime` publication. Required for the admin merchant panel.
4. `supabase-inventory-migration.sql` — creates `locations` (Bridgetown, St. George) + `product_stock` (per-location quantity & low-stock threshold), adds `pickup_location_id` FK on `orders`, and adds RLS so location_admins only see their own location's data. Required for **per-location inventory management**, the pickup-location picker on checkout, and post-payment stock decrement.
5. `supabase-events-migration.sql` — creates the `events` table (title, date, time, location, flyer URL, `is_active`, `is_featured`, `order_index`) + `events` storage bucket for flyer uploads + RLS (public READ of active rows, admin WRITE) + adds the table to the `supabase_realtime` publication. Required for the customer-facing **Events** page (`/events`) and live updates without redeploy.

**Steps:**
1. Open your Supabase project → SQL Editor → New Query
2. Paste the contents of each file (in order above) and click Run

## Membership & Coupon System

- **Tiers**: Standard (free, 8:30 PM cutoff), Gold ($9.99/30d, 9:30 PM cutoff, 5% off), Platinum ($19.99/30d, 10:30 PM cutoff, 10% off). Single source of truth in `web/src/lib/business.ts` mirrored in `server/business.ts`.
- **Subscription flow**: Authenticated user picks a tier on `/membership` → `POST /api/memberships/subscribe` (JWT-derived user) → PayPal one-time charge → `/payment-success` capture activates the row for 30 days. Active members are never downgraded mid-checkout — pending PayPal data is stored in separate `pending_*` columns.
- **Membership capture integrity**: server verifies captured PayPal amount + currency against the pending snapshot before activating.
- **Coupons**: `POST /api/coupons/validate` (preview only, never trusts client) + final discount recomputed in `createServerOrder`. Order in pricing logic: member % off subtotal first, then coupon applied to discounted subtotal. `free_delivery` coupons zero the delivery fee.
- **Auth boundary**: `server/auth.ts` reads `Authorization: Bearer <jwt>` and resolves the Supabase user. The frontend uses `web/src/lib/api.ts` (`authedFetch`) to attach this header. The server NEVER trusts a `user_id` field in request bodies — that prevented the original IDOR / tier-spoofing risk flagged in code review.

## Admin Merchant Panel (`/admin`)

- **URLs**: full-width responsive dashboard (mobile, tablet, desktop) with a sub-nav strip across the top:
  - `/admin` — Orders (live feed)
  - `/admin/inventory` — per-location stock with inline edit
  - `/admin/low-stock` — items at or below their threshold (single-click triage view)
  - `/admin/completed` — completed orders only (status filter is locked)
  Bypasses customer splash + age gate. Bottom nav is hidden for admin routes.
- **Authorization**: `server/auth.ts → ensureAdminContext(req)` checks the JWT `app_metadata.role`. Two roles are recognised, both gated server-side (`app_metadata` is service-role-only — users cannot promote themselves):
  - `admin` (super-admin) — sees all orders, all locations, all inventory.
  - `location_admin` — must also have `app_metadata.location` set to a location slug (e.g. `bridgetown`, `st_george`). All admin queries are auto-scoped to that location: orders, stats, inventory.
  - Promote a super-admin (run once in Supabase SQL editor):
    ```sql
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
     where email = 'owner@example.com';
    ```
  - Assign a location-admin (slug must match a row in `locations.slug`):
    ```sql
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
                             || '{"role":"location_admin","location":"bridgetown"}'::jsonb
     where email = 'bridgetown-manager@example.com';
    ```
- **Frontend guard**: `web/src/pages/admin/AdminGuard.tsx` — bounces unauthenticated users to `/auth/login`, shows access-denied for non-admin users. Real authorization is server-side; the guard only decides what UI to show.
- **API endpoints** (all require admin JWT; all auto-scoped for `location_admin`):
  - `GET   /api/admin/me` — `{ isAdmin, role, location_slug }`
  - `GET   /api/admin/orders?status=&fulfillment=&payment=&q=&date=&limit=&offset=` — paginated list + count
  - `GET   /api/admin/orders/:id` — full order + items (404 if outside the admin's location scope)
  - `PATCH /api/admin/orders/:id` — update `status` and/or `payment_status` (`paid_at` auto-stamped when marking paid)
  - `GET   /api/admin/stats/today` — total orders, pending, completed, sales, paid sales
  - `GET   /api/admin/locations` — `{ locations: [...], inventory_enabled: bool }`
  - `GET   /api/admin/inventory?q=&category=&location_slug=&low_stock=1` — joined product × location × stock rows with `status: in_stock | low | out`
  - `PATCH /api/admin/inventory` — body `{ product_id, location_id, quantity?, low_stock_threshold? }`; upserts the row, returns the refreshed row
  - `GET   /api/admin/inventory/categories` — distinct product categories for the filter dropdown
- **Public location endpoints** (no auth required — used by Checkout):
  - `GET /api/locations` — active pickup locations (id, slug, name, address)
  - `GET /api/locations/:slug/availability` — stock availability for a given product list at one location (used by future cart-side stock checks)
- **Realtime**: Orders dashboard subscribes to `postgres_changes` on `public.orders`; new orders trigger refetch + golden chime + badge. RLS gates delivery so location_admins only get notified for their location.
- **Status mapping**: customer-tracking values stay (`received, packing, out_for_delivery, delivered, refused`); admin gets two extra values (`confirmed`, `ready_for_pickup`).
- **Files**: `server/admin.ts`, `server/auth.ts` (`ensureAdminContext`), `server/inventory.ts`, `server/routes.ts` (admin + inventory + locations blocks), `web/src/pages/admin/{AdminDashboard,AdminTabs,InventoryPage,AdminGuard}.tsx`, `supabase-admin-migration.sql`, `supabase-inventory-migration.sql`.

## Events page (`/events`)
- **Customer-facing list of upcoming pop-ups, tastings, and on-site bars.** Powered entirely by the `events` Supabase table — no backend code changes are needed to publish a new event; the merchant just inserts a row.
- **Files**: `supabase-events-migration.sql`, `web/src/pages/Events.tsx`, `web/src/pages/EventDetail.tsx`, `web/src/components/BottomNav.tsx` (Events tab), `web/src/App.tsx` (`/events`, `/events/:id` routes).
- **Filtering**: only `is_active = true` AND `event_date >= today` rows render. Sorted by `event_date ASC`, then `start_time ASC`, then `order_index`. Past events disappear automatically.
- **Featured event**: rows with `is_featured = true` render at the top in a large gold-bordered hero card; the rest fall into a standard list below.
- **Detail view** (`/events/:id`): hero image, full description, date/time/location meta, **Get Directions** button (opens Google Maps with the address) and **Add to Calendar** button (opens Google Calendar's "Add Event" template prefilled with all fields).
- **Live updates**: `Events.tsx` subscribes to a `postgres_changes` realtime channel on `public.events`, so any insert/update/delete in Supabase Studio is reflected in the customer app within a second — no redeploy required. Falls back gracefully on instances where realtime is not enabled.
- **Adding an event** (in Supabase Studio):
  1. Storage → `events` bucket → upload your flyer image → click the file → "Get URL" (public). Paste that URL into `image_url`.
  2. Table Editor → `events` → Insert row → fill in `title`, `event_date` (YYYY-MM-DD), `start_time`/`end_time` (HH:MM:SS, optional), `location_name`, `location_address`, `description`, `image_url`. Set `is_active = true`. Set `is_featured = true` for the headliner. Use `order_index` to break ties between events on the same date.
  3. Done — the customer app updates live.

## Inventory & Pickup Locations

- **Locations**: seeded by the migration — `bridgetown` ("Bridgetown") and `st_george` ("St. George"). Add more via SQL by inserting into `public.locations` with a slug matching `^[a-z0-9_]+$`.
- **Per-location stock**: `product_stock(product_id, location_id, quantity, low_stock_threshold)` is the single source of truth for pickup orders. The legacy `products.stock_qty` column is ignored on pickup orders once the migration is applied.
- **Pickup-location picker**: Checkout fetches `/api/locations` and renders one card per active location. The chosen `pickup_location_id` is sent on `POST /api/orders/create` and saved on the order via the new FK column. If the migration hasn't run yet, Checkout silently falls back to the static `PICKUP_LOCATION` constant.
- **Stock validation on checkout**: `server/payment.ts` validates per-location stock for pickup orders BEFORE creating the order; insufficient stock returns a 400 with the offending product name.
- **Stock decrement after payment**: `decrementStockForOrder()` runs from `/api/paypal/capture-order` immediately after `updateOrderPaid()`. It only fires for paid pickup orders bound to a `pickup_location_id`. The decrement is:
  - **Atomic per-product** — uses an `UPDATE … WHERE quantity >= p_qty RETURNING quantity` in the `decrement_stock_for_pickup` Postgres function. Two concurrent buyers cannot both succeed once stock is exhausted; the loser logs a loud `OVERSELL` warning instead of silently clamping to zero.
  - **Aggregated by `product_id`** in both pre-checkout validation (`checkPickupStock`) and post-payment decrement so duplicate cart line items can't bypass the check.
  - **Idempotent** — `orders.stock_decremented_at` is stamped only when every line item applied successfully. Capture retries (`status: "ALREADY_PAID"` path) re-call `decrementStockForOrder` so a one-time RPC failure can self-heal on the next user action without ever double-decrementing.
  - **Non-blocking** — failures are logged but never fail the capture response (the customer still sees their order paid; the merchant resolves any discrepancy in the inventory tab).
- **Low-stock view**: `/admin/low-stock` is the same `InventoryPage` component pre-filtered with `low_stock=1`. Status badge colors: `in_stock` (green), `low` (gold), `out` (red).
- **Testing stock deduction end-to-end**:
  1. Apply `supabase-inventory-migration.sql` in the Supabase SQL editor.
  2. In `/admin/inventory`, set a product's quantity at "Bridgetown" to a small number (e.g. `5`) and Save.
  3. As a customer, add that product to cart, choose **Pick Up** → **Bridgetown**, complete checkout via PayPal sandbox.
  4. After the success page returns, refresh `/admin/inventory` — the Bridgetown row's quantity for that product should have decreased by the ordered quantity. The corresponding `product_stock.updated_at` will be refreshed.
  5. Switching the picker to **St. George** for the same product should NOT affect Bridgetown's count.

## Payment System

- **Architecture**: Checkout saves order in Supabase before any redirect. No card data collected in-app. All PayPal secrets stay server-side.
- **PayPal flow**:
  1. User fills checkout form, selects "Pay Online"
  2. Order created in Supabase: `payment_status=pending`, `payment_method=online_card`, `gateway_name=paypal`
  3. Frontend calls `POST /api/paypal/create-order` → backend creates PayPal order via Orders API v2, returns `approvalUrl`
  4. Order ID saved to `localStorage["hd_pending_payment_order_id"]`, cart cleared
  5. User redirected to PayPal hosted approval page (full-page redirect — works in Median/webview)
  6. PayPal redirects back to `/payment-success?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID` on approval
  7. PaymentSuccess calls `POST /api/paypal/capture-order` → backend captures payment → Supabase order marked `paid` with `payment_reference` and `paid_at`
  8. On cancel → PayPal redirects to `/payment-cancelled` → frontend calls `POST /api/paypal/cancel-order` → order marked `cancelled`
- **Cash on Delivery**: Order saved normally, navigates directly to order tracking. Always available.
- **Backend API endpoints**:
  - `GET  /api/health` — includes PayPal configuration status
  - `GET  /api/paypal/config` — returns `{configured, environment}` for frontend to check
  - `POST /api/paypal/create-order` — creates PayPal order, returns `{paypalOrderId, approvalUrl}`
  - `POST /api/paypal/capture-order` — captures payment, marks Supabase order as `paid`
  - `POST /api/paypal/cancel-order` — marks Supabase order as `cancelled`
  - `POST /api/paypal/fail-order` — marks Supabase order as `failed`
- **Sandbox vs Live**: Set `PAYPAL_ENV=live` to switch to production PayPal. Default is `sandbox`.
- **Retry flow**: Failed/cancelled screens navigate back to `/checkout` with order ID preserved
- **Order tracking**: Shows payment status badge + "Complete Payment" / "Retry Payment" button
- **Result routes**: `/payment-success`, `/payment-cancelled`, `/payment-failed` (canonical). Legacy `/payment/*` routes redirect with query params preserved.
- **Order fields**: `payment_method`, `payment_status`, `payment_reference`, `gateway_name`, `paid_at`
- **payment_status values**: `pending`, `paid`, `failed`, `cancelled`, `refunded`
- **payment_method values**: `cash_on_delivery`, `online_card`
- **Auth guard bypass**: Payment result routes bypass auth check — users returning from PayPal always see their result
- **Double-submit guard**: `submittingRef` in Checkout prevents duplicate orders
- **Server security**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` exclusively for order updates — no anon key fallback. Fails explicitly if not configured.

## Environment Variables (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (also used as VITE_ via envPrefix) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (also used as VITE_ via envPrefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key — backend only, for server-side order updates |
| `PAYPAL_CLIENT_ID` | **Yes, for PayPal** | PayPal REST app Client ID (sandbox or live) |
| `PAYPAL_CLIENT_SECRET` | **Yes, for PayPal** | PayPal REST app Client Secret |
| `PAYPAL_ENV` | No | `sandbox` (default) or `live` |

## Design System

- Background: `#09090C` (deep black)
- Product Cards: `#121212` + `#1C1828` image area (dark premium)
- Dark Cards: `#13121A` (orders, tracking)
- Gold Gradient: `#D4901A → #F5C842`
- Gold Accent: `#E4A12B`
- Magenta Accent: `#C91E8C`
- PayPal Blue: `#0070BA` / `#003087`
- Search bars: `#1A1A26` bg + `rgba(228,161,43,0.2)` gold border
- Tab Bar: `#0C0B10`

## Brand Assets

- `assets/logo/hd-xquisite-logo-dark.png` — PRIMARY official logo (use everywhere)
- `assets/images/hennessy.png`, `vodka.png`, `rum.png`, `wine.png` — local fallback bottle images

## Authentication (Supabase Auth)

- **AuthProvider**: `context/AuthContext.tsx` — provides `user`, `session`, `isGuest`, `loading`, `signIn`, `signUp`, `signOut`, `continueAsGuest`
- **Session persistence**: `lib/supabase.ts` uses localStorage with `storageKey: "hd-xquisite-mobile-auth"`
- **Auth guard**: Redirects unauthenticated/non-guest users to `/auth/welcome`; payment result pages bypass auth
- **Flow**: Age gate → Auth welcome → Log In / Sign Up / Guest → Main app
- **Guest access**: Full app access; profile shows Guest badge + CTA to create account

## Port Layout

| Service | Dev Port | Notes |
|---------|----------|-------|
| Vite dev server | 5000 | Replit Preview — webview target |
| Express backend | 3001 | API — proxied from Vite via `/api` |

## Error Handling

All data-fetching pages (Home, Search, Orders, ProductDetail) have proper `.catch()` error handling with retry buttons. Context providers use unmount guards and memoization. Null-safe `.toFixed()` throughout OrderTracking and Orders.
