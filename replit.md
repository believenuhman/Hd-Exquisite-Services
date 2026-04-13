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

## REQUIRED: Run This Migration Before Going Live

The `supabase-payment-migration.sql` file in the project root **must be applied** in Supabase before payment features work. Without it, order creation will fail because payment columns don't exist.

**Steps:**
1. Open your Supabase project → SQL Editor → New Query
2. Paste the contents of `supabase-payment-migration.sql` and click Run

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
