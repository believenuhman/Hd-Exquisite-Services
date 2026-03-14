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

## Products (data/products.ts)

1. Hennessy VS — $42.99 (Cognac, featured)
2. Don Julio 1942 — $169.99 (Tequila, featured)
3. Johnnie Walker Blue — $219.99 (Scotch, featured)
4. Plantation XO — $58.99 (Rum)
5. Belvedere Pure — $39.99 (Vodka)
6. Opus One 2019 — $349.99 (Wine)
