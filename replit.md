# HD Xquisite Liquors

A premium liquor delivery web app (React + Vite + Tailwind) built for Median web wrapping. Expo has been removed — the Vite web app is the primary app.

## Architecture

- **Web App (Vite)**: React + Vite + Tailwind CSS, mobile-first design — port 5000 (`web/`) — PRIMARY APP
- **Backend (Express)**: Payment API + static file serving — port 3000 (dev), PORT env var (prod)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with localStorage session persistence
- **State**: React Context (CartContext, AuthContext, AgeGateContext, AppSettingsContext)
- **Fonts**: PlayfairDisplay (headings) + CormorantGaramond (body) + Inter (UI/product cards)
- **Payments**: PayPal Orders API (primary online payment); Cash on Delivery always available

## Web App (`web/`)

- **Entry**: `web/src/main.tsx` — max-width 480px mobile-first layout
- **Router**: React Router DOM v6
- **Styling**: Tailwind CSS with custom font/color tokens + inline `index.css` animations
- **Build**: Vite 5 — `cd web && npm run build` produces `web/dist/`
- **PWA**: `web/public/manifest.json` + icons — enables "Add to Home Screen" on mobile
- **Workflows**: "Start Web App" (port 5000, webview) + "Start Backend" (port 3000, console)
- **Pages**: AgeGate → Welcome → Login/Signup/ForgotPassword → Home → Search → ProductDetail → Cart → Checkout → Profile → Orders → OrderTracking → Settings → ContactSupport → **PaymentMock** → **PaymentSuccess** → **PaymentFailed** → **PaymentCancelled**
- **Components**: SplashScreen, BottomNav (5 tabs), DrawerMenu, ProductCard

## REQUIRED: Run This Migration Before Going Live

The `supabase-payment-migration.sql` file in the project root **must be applied** in Supabase before payment features work fully. Without it:
- Payment method / status columns don't exist in the orders table
- The app gracefully falls back (orders still save, PayPal redirect still works) but payment_status won't be tracked

**Steps:**
1. Open your Supabase project → SQL Editor → New Query
2. Paste the contents of `supabase-payment-migration.sql` and click Run

Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in Replit Secrets to activate online payment.

## Payment System

- **Architecture**: Checkout saves order in Supabase before any redirect. No card data collected in-app.
- **Active flow — PayPal Orders API**:
  1. User fills checkout form, selects "Pay Online"
  2. Order created in Supabase: `payment_status=pending`, `payment_method=online_card`, `gateway_name=paypal`
  3. Frontend calls `POST /api/paypal/create-order` → backend creates PayPal order, returns `approvalUrl`
  4. Order ID saved to `localStorage["hd_pending_payment_order_id"]`
  5. User redirected to PayPal hosted approval page
  6. PayPal redirects back to `/payment-success?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID` on approval
  7. PaymentSuccess calls `POST /api/paypal/capture-order` → backend captures payment → Supabase order marked `paid`
  8. On cancel → PayPal redirects to `/payment-cancelled` → calls `POST /api/paypal/cancel-order` → order marked `cancelled`
- **Backend API endpoints**:
  - `POST /api/paypal/create-order` — creates PayPal order, returns `{paypalOrderId, approvalUrl}`
  - `POST /api/paypal/capture-order` — captures payment, marks Supabase order as `paid`
  - `POST /api/paypal/cancel-order` — marks Supabase order as `cancelled`
  - `GET  /api/health` — includes PayPal configuration status
- **Sandbox vs Live**: Set `PAYPAL_ENV=live` to switch to production. Default is `sandbox`.
- **Cash on Delivery**: Order saved normally, navigates directly to order tracking. Always available.
- **Retry flow**: Failed/cancelled screens navigate back to `/checkout` with the order ID preserved
- **Order tracking**: Shows payment status badge + "Complete Payment" / "Retry Payment" button (navigates to checkout)
- **Result routes**: `/payment-success`, `/payment-cancelled`, `/payment-failed` (canonical). Legacy `/payment/*` routes redirect with query params preserved.
- **Order fields**: `payment_method`, `payment_status`, `payment_reference`, `gateway_name`, `paid_at`
- **payment_status values**: `pending`, `paid`, `failed`, `cancelled`, `refunded`
- **payment_method values**: `cash_on_delivery`, `online_card`
- **DB Migration**: Run `supabase-payment-migration.sql` in Supabase SQL Editor
- **Auth guard bypass**: Payment result routes bypass auth check — users returning from PayPal always see their result
- **Double-submit guard**: `submittingRef` in Checkout prevents duplicate orders

## Environment Variables (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Supabase service key for backend order updates |
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
- Search bars: `#1A1A26` bg + `rgba(228,161,43,0.2)` gold border
- Tab Bar: `#0C0B10`
- All colors: `constants/colors.ts`

## Brand Assets

- `assets/logo/hd-xquisite-logo-dark.png` — PRIMARY official logo (use everywhere)
- `assets/images/logo.jpg` — OLD file, do NOT use
- `assets/images/hennessy.png`, `vodka.png`, `rum.png`, `wine.png` — local fallback bottle images

## Reusable Components

- `components/ScreenBackground.tsx` — dark gradient + particle background
- `components/ProductCard.tsx` — 162px dark portrait card with bestseller badge + rating pill
- `components/SplashOverlay.tsx` — animated splash screen with glow rings + floating particles
- `components/DrawerMenu.tsx` — slide-in navigation drawer (uses Modal, pointerEvents in style)

## Screens

- `app/(tabs)/index.tsx` — Home: avatar/greeting, search pill, category pills, Trending + All Spirits
- `app/(tabs)/search.tsx` — Explore: live filtering with FlatList
- `app/(tabs)/cart.tsx` — My Cart: glass item rows with quantity stepper + gold checkout
- `app/(tabs)/profile.tsx` — Profile: member badge, stats, settings menu
- `app/product/[id].tsx` — Product Detail: full-screen bottle + dual CTAs

## Navigation

Root Stack → Tabs (Home, Search, Cart[badge], Profile) + Product Detail (slide animation)

## Key Assets

- `assets/images/particle-bg.png` — Gold bokeh particle background texture
- `assets/images/icon.png` / `splash-icon.png` — Gold sphere app icon
- `assets/images/hennessy.png`, `donjulio.png`, `johnniewalker.png`, `rum.png`, `vodka.png`, `wine.png` — AI-generated product bottle images

## Authentication (Supabase Auth)

- **AuthProvider**: `context/AuthContext.tsx` — provides `user`, `session`, `isGuest`, `loading`, `signIn`, `signUp`, `signOut`, `continueAsGuest`
- **Session persistence**: `lib/supabase.ts` uses AsyncStorage with `storageKey: "hd-xquisite-mobile-auth"` so sessions survive app restarts
- **AuthGuard** in `app/_layout.tsx`: redirects unauthenticated/non-guest users to `/auth/welcome`; redirects signed-in users away from auth screens
- **Flow**: Age gate → Auth welcome → Log In / Sign Up / Guest → Main app
- **Guest access**: Full app access; profile shows Guest badge + CTA to create account
- **Signed-in**: Profile shows name from `user.user_metadata.full_name`, email, Premium Member badge, Sign Out
- **Auth screens**: `app/auth/` (welcome, login, signup, forgot-password)
- **Profiles table**: SQL in `supabase-schema.sql` — run in Supabase SQL Editor to auto-create profiles on signup via trigger
- **Extra user fields**: `full_name` + `phone` stored in Supabase `user_metadata` on sign up

## Standalone Mobile Build (EAS — No Expo Go Required)

- **EAS CLI**: `eas-cli@18.4.0` installed (local `node_modules/.bin/eas`)
- **Android package**: `com.hdxquisiteliquors.app`
- **iOS bundle ID**: `com.hdxquisiteliquors.app`
- **Android versionCode**: `1`
- **iOS buildNumber**: `"1"`
- **App slug**: `hd-xquisite-liquors`
- **Deep-link scheme**: `hdxquisiteliquors`
- **Config file**: `app.config.ts` (overrides `app.json`; `app.json` is a minimal stub)
- **Dev origin**: injected only when `EXPO_PUBLIC_DOMAIN` is set (Replit preview). Production builds use native scheme routing.
- **OTA updates**: disabled (`updates.enabled: false`) — no EAS Update server required.
- **Metro**: `metro.config.js` blocks `web/`, `.local/skills`, `.local/state`, `.local/tasks` from the mobile bundle.

### EAS build profiles (eas.json)
| Profile | Output | Distribution | Use case |
|---------|--------|--------------|----------|
| `development` | APK (dev client) | internal | Expo Dev Client for local debugging |
| `preview` | APK | internal | Sideload & QA test |
| `production` | **APK** | internal | Standalone production APK — installs directly |
| `store` | AAB | store | Play Store submission |

### Required EAS secrets (set once via CLI or EAS Dashboard)
The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` at build time.
Set them as EAS project secrets before building:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --scope project
```
Or set them in the [EAS Dashboard](https://expo.dev) → Project → Secrets.

### To build a standalone production APK
```bash
# One-time: log in to your Expo account
npx eas login

# Build standalone APK (no Expo Go, no dev server)
npx eas build -p android --profile production
```
EAS queues a cloud build and returns a download URL for the `.apk`. Install directly on any Android device.

### To build for iOS
```bash
npx eas build -p ios --profile production
```

### To submit to the Play Store
```bash
npx eas build -p android --profile store
npx eas submit -p android --profile store
```

## Products (data/products.ts)

1. Hennessy VS — $42.99 (Cognac, featured)
2. Don Julio 1942 — $169.99 (Tequila, featured)
3. Johnnie Walker Blue — $219.99 (Scotch, featured)
4. Plantation XO — $58.99 (Rum)
5. Belvedere Pure — $39.99 (Vodka)
6. Opus One 2019 — $349.99 (Wine)
