# HD Xquisite Liquors

A premium liquor delivery web app (React + Vite + Tailwind) built for Median web wrapping. Expo has been removed — the Vite web app is the primary app.

## Architecture

- **Web App (Vite)**: React + Vite + Tailwind CSS, mobile-first design — port 5000 (`web/`) — PRIMARY APP
- **Backend (Express)**: Payment API + static file serving — port 3000 (dev), PORT env var (prod)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with localStorage session persistence
- **State**: React Context (CartContext, AuthContext, AgeGateContext, AppSettingsContext)
- **Fonts**: PlayfairDisplay (headings) + CormorantGaramond (body) + Inter (UI/product cards)
- **Payments**: Stripe payment link (active); WiPay Caribbean code retained; Mock fallback available

## Web App (`web/`)

- **Entry**: `web/src/main.tsx` — max-width 480px mobile-first layout
- **Router**: React Router DOM v6
- **Styling**: Tailwind CSS with custom font/color tokens + inline `index.css` animations
- **Build**: Vite 5 — `cd web && npm run build` produces `web/dist/`
- **PWA**: `web/public/manifest.json` + icons — enables "Add to Home Screen" on mobile
- **Workflows**: "Start Web App" (port 5000, webview) + "Start Backend" (port 3000, console)
- **Pages**: AgeGate → Welcome → Login/Signup/ForgotPassword → Home → Search → ProductDetail → Cart → Checkout → Profile → Orders → OrderTracking → Settings → ContactSupport → **PaymentMock** → **PaymentSuccess** → **PaymentFailed** → **PaymentCancelled**
- **Components**: SplashScreen, BottomNav (5 tabs), DrawerMenu, ProductCard

## Payment System

- **Architecture**: Checkout saves order in Supabase before any redirect. No card data collected in-app.
- **Active flow — Stripe payment link**:
  1. User fills checkout form, selects "Pay Online"
  2. Order created in Supabase: `payment_status=pending`, `payment_method=online_card`, `gateway_name=stripe`
  3. Order ID saved to `localStorage["hd_pending_payment_order_id"]`
  4. User redirected to `https://buy.stripe.com/test_28E7sK0Hwdf643lgUGbMQ00`
  5. Stripe handles card entry on their hosted page
  6. On success → redirected to `/payment-success` (updates order to `paid`, clears localStorage)
  7. On cancel → redirected to `/payment-cancelled` (updates order to `cancelled`)
  8. On failure → redirected to `/payment-failed` (updates order to `failed`)
- **Stripe dashboard**: Configure the payment link's success URL to `https://<domain>/payment-success` and cancel URL to `https://<domain>/payment-cancelled`
- **Retry flow**: Both failed and cancelled screens offer "Retry Payment" — re-opens Stripe link, order ID still in localStorage
- **Cash on Delivery**: Order saved normally, `payment_status=pending`, navigates directly to order tracking
- **Order tracking**: Shows payment status badge (Paid/Awaiting Payment/Payment Failed/Payment Cancelled/Refunded) + "Complete Payment" banner if outstanding
- **Result routes**: `/payment-success`, `/payment-cancelled`, `/payment-failed` (canonical). Old `/payment/*` routes redirect to these.
- **Order fields**: `payment_method`, `payment_status`, `payment_reference`, `gateway_name`, `paid_at`
- **payment_status values**: `pending`, `paid`, `failed`, `cancelled`, `refunded`
- **payment_method values**: `cash_on_delivery`, `online_card`
- **DB Migration**: Run `supabase-payment-migration.sql` in Supabase SQL Editor (includes "cancelled" in constraint)
- **Auth guard bypass**: Payment result routes (`/payment-success`, `/payment-failed`, `/payment-cancelled`, `/payment/*`) bypass the auth check so users returning from Stripe always see their result (even if guest session was cleared)

## Environment Variables (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Secure backend order updates |
| `PAYMENT_GATEWAY` | No | "wipay" (default), "stripe", or "mock" |
| `WIPAY_ACCOUNT_NUMBER` | No* | WiPay merchant account number (default: "1" test) |
| `WIPAY_API_KEY` | No* | WiPay API key for hash verification (default: "123" test) |
| `WIPAY_COUNTRY_CODE` | No | "TT" (default), "BB", or "JM" |
| `WIPAY_ENVIRONMENT` | No | "sandbox" (default) or "live" |
| `WIPAY_FEE_STRUCTURE` | No | "customer_pay" (default), "merchant_pay", or "split" |
| `STRIPE_SECRET_KEY` | No* | Activates Stripe mode |
| `STRIPE_WEBHOOK_SECRET` | No* | Required for Stripe webhook validation |

*Required for live/production payments

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

## Android Build (EAS — Standalone, No Expo Go)

- **EAS CLI**: `eas-cli@18.3.0` installed (local `node_modules/.bin/eas`)
- **Android package**: `com.hdxquisiteliquors.app`
- **iOS bundle ID**: `com.hdxquisiteliquors.app`
- **App slug**: `hd-xquisite-liquors`
- **Deep-link scheme**: `hdxquisiteliquors`
- **Config file**: `app.config.ts` (overrides `app.json`; `app.json` is now a minimal stub)
- **Expo Go origin removed**: `app.config.ts` only injects the Replit origin when `EXPO_PUBLIC_DOMAIN` is present (dev). Production builds get no origin → native scheme routing.
- **OTA updates**: disabled (`updates.enabled: false`) — standalone binary, no EAS Update server required.

### EAS build profiles (eas.json)
| Profile | Output | Distribution | Use case |
|---------|--------|--------------|----------|
| `development` | APK (dev client) | internal | Expo Dev Client for local debugging |
| `preview` | APK | internal | Sideload & QA test (no Expo Go required) |
| `production` | **APK** | internal | Standalone production APK — installs directly |
| `store` | AAB | store | Play Store submission |

### Before building: set the production API URL
Edit `eas.json` and replace `https://YOUR_BACKEND_URL_HERE` in all three non-dev profiles with the deployed backend URL. Alternatively set it in the [EAS Dashboard](https://expo.dev) under **Environment Variables**.

### To build a standalone production APK
```bash
# One-time: log in to your Expo account
npx eas login

# Build standalone APK (no Expo Go, no dev server)
npx eas build -p android --profile production
```
EAS queues a cloud build and returns a download URL for the `.apk`. Install directly on any Android device — it opens like a normal app.

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
