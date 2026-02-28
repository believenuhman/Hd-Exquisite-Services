# HD Xquisite Liquors

A luxury premium liquor delivery mobile app built with Expo React Native.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000
- **State**: React Context (CartContext) for cart management, AsyncStorage-ready
- **Fonts**: Playfair Display (display/titles) + Cormorant Garamond (body/secondary)

## Design System

- Background: `#0B0B0F` (deep black)
- Cards: `#14141C` (dark glassmorphism)
- Gold Accent: `#D6A24A → #F6D27A` gradient
- All colors in `constants/colors.ts`

## Key Files

- `data/products.ts` — Product catalog with 6 luxury spirits
- `context/CartContext.tsx` — Global cart state (add/remove/quantity)
- `components/ProductCard.tsx` — Reusable horizontal product card
- `components/SplashOverlay.tsx` — Animated gold sphere splash screen

## Screens

- `app/(tabs)/index.tsx` — Home: greeting, search, categories, featured + trending
- `app/(tabs)/search.tsx` — Search with live filtering and category pills
- `app/(tabs)/cart.tsx` — Cart with quantity controls and order summary
- `app/(tabs)/profile.tsx` — Profile with member badge and settings menu
- `app/product/[id].tsx` — Product detail with bottle image, glow, and dual CTAs
- `app/(tabs)/_layout.tsx` — Gold-accent tab bar with cart badge

## Navigation

Root Stack → Tabs (Home, Search, Cart, Profile) + Product Detail (stack slide)

## Products

1. Hennessy VS — $42.99 (Cognac)
2. Don Julio 1942 — $169.99 (Tequila)
3. Johnnie Walker Blue — $219.99 (Scotch)
4. Plantation XO — $58.99 (Rum)
5. Belvedere Pure — $39.99 (Vodka)
6. Opus One 2019 — $349.99 (Wine)
