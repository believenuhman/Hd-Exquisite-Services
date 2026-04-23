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

- **URL**: `/admin` — full-width responsive dashboard (mobile, tablet, desktop). Bypasses customer splash + age gate. Bottom nav is hidden for admin routes.
- **Authorization**: `server/auth.ts → requireAdmin(req)` checks the JWT `app_metadata.role === 'admin'`. ALL `/api/admin/*` routes are gated by this. `app_metadata` is service-role-only — users cannot promote themselves.
  - Promote a user to admin (run once in Supabase SQL editor):
    ```sql
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
     where email = 'admin@example.com';
    ```
- **Frontend guard**: `web/src/pages/admin/AdminGuard.tsx` — bounces unauthenticated users to `/auth/login`, shows access-denied for non-admin users, renders dashboard for admins. Real authorization is server-side; the guard only decides what UI to show.
- **API endpoints** (all require admin JWT):
  - `GET   /api/admin/me` — `{ isAdmin: bool }`
  - `GET   /api/admin/orders?status=&fulfillment=&payment=&q=&date=&limit=&offset=` — paginated list + count
  - `GET   /api/admin/orders/:id` — full order + items
  - `PATCH /api/admin/orders/:id` — update `status` and/or `payment_status` (paid_at auto-stamped when marking paid)
  - `GET   /api/admin/stats/today` — total orders, pending, completed, sales, paid sales
- **Realtime**: dashboard subscribes to `postgres_changes` on `public.orders` via supabase-js; new orders trigger a refetch + golden chime + on-screen badge. Admin RLS (`admin manage orders`) gates realtime delivery server-side.
- **Status mapping**: customer-tracking values stay (`received, packing, out_for_delivery, delivered, refused`); admin gets two new values (`confirmed`, `ready_for_pickup`) and presents friendly labels (New, Confirmed, Preparing, Out for Delivery, Ready for Pickup, Completed, Cancelled).
- **Files**: `server/admin.ts`, `server/routes.ts` (admin block), `web/src/pages/admin/AdminDashboard.tsx`, `web/src/pages/admin/AdminGuard.tsx`, `supabase-admin-migration.sql`.

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
