# Threat Model

## Project Overview

HD Xquisite Liquors is a liquor ordering application deployed on Replit as a Vite web client (`web/`) served by an Express backend (`server/`). It uses Supabase for authentication, PostgreSQL data storage, and storage buckets, and it integrates with PayPal for online payments. Customers can browse products, place orders as guests or authenticated users, and track delivery/payment status.

Current production deployment scope is defined by `.replit`: the shipped runtime is the built `web/` app plus `server_dist/index.js`. The Expo app under `app/` and the separate admin app under `apps/admin/` are not part of the current Replit production deployment unless separately deployed later; they are useful context but should usually be treated as dev-only for this deployment unless production reachability is demonstrated.

Platform assumptions for future scans: Replit provides TLS for deployed traffic, `NODE_ENV=production` in production, and mockup/sandbox environments are not production.

## Assets

- **Customer order data** — names, phone numbers, delivery addresses, order history, refusal reasons, timestamps, and payment status. Exposure reveals sensitive personal and business data.
- **Payment integrity** — order totals, delivery fees, currency, payment status, PayPal order/capture references, and the binding between a checkout session and the resulting order. Compromise enables underpayment, order fraud, or operational sabotage.
- **Catalog and store configuration** — products, pricing, stock, delivery zones, fees, and store settings. Unauthorized changes affect revenue and customer trust.
- **Authentication state and profiles** — Supabase sessions, user identifiers, and profile metadata. Compromise can enable impersonation or broaden access to order history and privileged write paths.
- **Application secrets** — `SUPABASE_SERVICE_ROLE_KEY`, PayPal client secret, and other server-side credentials. Exposure would allow unrestricted database or payment actions.

## Trust Boundaries

- **Browser to Express API** — requests to `/api/*` come from an untrusted client. The server must not trust user-supplied order identifiers, prices, redirect origins, or payment state.
- **Browser to Supabase directly** — the web client uses the public Supabase anon key and therefore relies entirely on Supabase RLS for authorization. Any overly broad policy is production-reachable immediately.
- **Express to Supabase service role** — the backend uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. Any backend endpoint that mutates orders must independently authenticate/authorize and validate inputs before writing.
- **Express to PayPal** — the backend calls PayPal with secret credentials. It must bind PayPal transactions to the correct local order and verify amounts/status before marking orders paid.
- **Guest/public to authenticated users** — customers may use guest checkout, but public flows must not expose other customers’ records or confer admin-like database capabilities.

## Scan Anchors

- **Production entry points:** `web/src/main.tsx`, `web/src/App.tsx`, `server/index.ts`, `server/routes.ts`, `server/payment.ts`, `supabase-schema.sql`
- **Highest-risk areas:** Supabase RLS policies in `supabase-schema.sql`; checkout/payment flows in `web/src/pages/Checkout.tsx`, `web/src/pages/PaymentSuccess.tsx`, `web/src/pages/PaymentCancelled.tsx`, `web/src/pages/OrderTracking.tsx`; privileged order updates in `server/routes.ts` and `server/payment.ts`
- **Public vs authenticated vs admin surfaces:** Product browsing and checkout are public/guest-capable; direct Supabase data access is governed by RLS; there is no production-proven separate admin deployment in this Replit deployment, so admin concerns should be reduced to whether production policies grant excessive privileges to ordinary authenticated users
- **Usually dev-only areas:** `app/` Expo client, `apps/admin/` separate admin SPA, `.expo/`, attached assets, local workflow helpers

## Threat Categories

### Spoofing

Customers authenticate with Supabase Auth, but the application also supports guest flows. Protected actions that mutate shared state MUST bind requests to a legitimate actor or a server-validated checkout artifact; possession of a guessed order ID, localStorage value, or client-generated request body must not be enough to act as another customer or as an admin.

### Tampering

The client is untrusted for pricing, delivery fees, payment identifiers, and order state. Order totals, line items, and payment transitions MUST be derived or verified server-side against authoritative database state before any order is created, charged, or marked paid/cancelled/failed.

### Information Disclosure

Customer orders contain PII and operationally sensitive details. Supabase policies and API responses MUST ensure that users can read only their own records (or the minimum required for guest recovery flows). Public routes and direct database access MUST NOT expose the full order book, addresses, phone numbers, or payment metadata.

### Denial of Service

Public checkout and payment endpoints can be called without trust. They SHOULD impose reasonable validation and anti-abuse controls so attackers cannot spam order creation, trigger repeated payment API calls, or mark arbitrary orders into failed/cancelled states at scale.

### Elevation of Privilege

Supabase write policies and backend service-role operations are the main privilege escalation risks. Only true administrative principals should be able to modify products, settings, zones, and arbitrary order state. Any policy based only on `auth.role() = 'authenticated'` is insufficient for admin authorization in this project. Backend endpoints using the service role MUST enforce ownership or admin checks explicitly because RLS does not protect them.
