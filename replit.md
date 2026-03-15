# HD Xquisite Liquors

A premium liquor delivery mobile app built with Expo React Native, inspired by Drizly/Uber Eats UX with HD XQUISITE brand identity.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000
- **State**: React Context (CartContext) for cart management
- **Fonts**: Playfair Display (headings) + Cormorant Garamond (body) + Inter (UI/product cards)

## Design System

- Background: `#09090C` (deep black)
- Product Cards: `#FFFFFF` (white, clean ecommerce style)
- Card Image Area: `#F4EFE6` (warm cream)
- Dark Cards: `#13121A` (banners, order cards)
- Gold Gradient: `#D4901A → #F5C842`
- Gold Accent: `#E4A12B` (category pills, badges, add buttons)
- Magenta Accent: `#C91E8C` (cart badge, brand accent)
- Tab Bar: `#0C0B10`
- All colors: `constants/colors.ts`

## Brand Assets

- `assets/images/hd-logo.png` — HD XQUISITE globe logo (magenta + gold)
- `assets/images/hennessy.png`, `vodka.png`, `rum.png`, `wine.png` — local fallback bottle images

## Reusable Components

- `components/ScreenBackground.tsx` — dark gradient + particle background
- `components/ProductCard.tsx` — 162px white portrait card with bestseller badge + rating pill
- `components/SplashOverlay.tsx` — animated splash screen

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
