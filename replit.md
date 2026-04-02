# HD Xquisite Liquors

A premium liquor delivery web app (React + Vite + Tailwind) built for Median web wrapping. Expo has been removed — the Vite web app is the primary app.

## Architecture

- **Web App (Vite)**: React + Vite + Tailwind CSS, mobile-first design — port 5000 (`web/`) — PRIMARY APP
- **Backend (Express)**: Payment API + static file serving — port 3000 (dev), PORT env var (prod)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with localStorage session persistence
- **State**: React Context (CartContext, AuthContext, AgeGateContext, AppSettingsContext)
- **Fonts**: PlayfairDisplay (headings) + CormorantGaramond (body) + Inter (UI/product cards)
- **Payments**: WiPay hosted payment link (primary); Cash on Delivery; Stripe can be re-added later

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
- The app gracefully falls back (orders still save, WiPay still redirects) but payment_status won't be tracked

**Steps:**
1. Open your Supabase project → SQL Editor → New Query
2. Paste the contents of `supabase-payment-migration.sql` and click Run

Set `VITE_WIPAY_PAYMENT_LINK` to your WiPay payment link URL to activate online payment (see Environment Variables below).

## Payment System

- **Architecture**: Checkout saves order in Supabase before any redirect. No card data collected in-app.
- **Active flow — WiPay hosted payment link**:
  1. User fills checkout form, selects "Pay Online"
  2. App validates all fields + checks `VITE_WIPAY_PAYMENT_LINK` is set
  3. Order created in Supabase: `payment_status=pending`, `payment_method=online_card`, `gateway_name=wipay`
  4. Order ID saved to `localStorage["hd_pending_payment_order_id"]`
  5. User redirected to WiPay hosted payment page (`VITE_WIPAY_PAYMENT_LINK`)
  6. WiPay handles card entry on their hosted page
  7. On success → WiPay redirects to `/payment-success` — reads `transaction_id` param, updates order to `paid`
  8. On cancel → WiPay redirects to `/payment-cancelled` — updates order to `cancelled`
  9. On failure → WiPay redirects to `/payment-failed` — updates order to `failed`
  10. WiPay may also return a `status` param: "success", "failed", "cancelled" — PaymentSuccess handles routing automatically
- **WiPay dashboard setup**: Configure the payment link's return URL to `https://<domain>/payment-success`. WiPay will append `?status=success&transaction_id=...` (or failed/cancelled). Cancel URL: `https://<domain>/payment-cancelled`.
- **Retry flow**: Failed and cancelled screens offer "Retry with WiPay" — re-opens WiPay link, order ID still in localStorage
- **Not configured**: If `VITE_WIPAY_PAYMENT_LINK` is empty, "Pay Online" button is disabled with a clear message; users can still use Cash on Delivery
- **Cash on Delivery**: Order saved normally, `payment_status=pending`, navigates directly to order tracking
- **Order tracking**: Shows payment status badge (Paid/Awaiting Payment/Payment Failed/Payment Cancelled/Refunded) + "Pay with WiPay" banner if outstanding
- **Result routes**: `/payment-success`, `/payment-cancelled`, `/payment-failed` (canonical). Old `/payment/*` routes redirect with query params preserved (via `QueryRedirect`).
- **Order fields**: `payment_method`, `payment_status`, `payment_reference`, `gateway_name`, `paid_at`
- **payment_status values**: `pending`, `paid`, `failed`, `cancelled`, `refunded`
- **payment_method values**: `cash_on_delivery`, `online_card`
- **DB Migration**: Run `supabase-payment-migration.sql` in Supabase SQL Editor
- **Auth guard bypass**: Payment result routes bypass auth check — users returning from WiPay always see their result even if guest session was cleared
- **Double-submit guard**: `submittingRef` in Checkout prevents duplicate orders if user taps "Place Order" twice

## Environment Variables (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_WIPAY_PAYMENT_LINK` | **For online payment** | Your WiPay hosted payment link URL. When set, "Pay Online" is active. If blank, Pay Online button is disabled. |
| `VITE_WIPAY_SUCCESS_URL` | No | Override for success return path (default: `/payment-success`) |
| `VITE_WIPAY_CANCEL_URL` | No | Override for cancel return path (default: `/payment-cancelled`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Secure backend order updates |

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
