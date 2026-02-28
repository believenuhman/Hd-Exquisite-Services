# HD Xquisite Liquors

A luxury premium liquor delivery mobile app built with Expo React Native, styled to match a high-end cinematic aesthetic.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000
- **State**: React Context (CartContext) for cart management
- **Fonts**: Playfair Display (titles/headings) + Cormorant Garamond (body/secondary)

## Design System

- Background: `#0B0B0F` (deep black)
- Cards: `rgba(20,20,28,0.78)` (dark glassmorphism)
- Gold Gradient: `#D6A24A → #F6D27A`
- Gold Accent: `#E8B86D`
- Muted Text: `rgba(185,185,195,0.8)` (`#B9B9C3`)
- Card Border: `rgba(214,162,74,0.25)`
- All colors defined in `constants/colors.ts`

## Reusable Components

- `components/ScreenBackground.tsx` — particle-bg.png + gradient overlay on every screen
- `components/GoldButton.tsx` — `filled` (gold gradient) or `outline` (gold border) variants
- `components/GlassCard.tsx` — dark glass card with gold border
- `components/ProductCard.tsx` — 170×230 luxury product card with bottle glow
- `components/SplashOverlay.tsx` — animated sphere splash with floating particles

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
