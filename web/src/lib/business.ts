// Single source of truth for business rules used across the storefront.
// Keep all hardcoded business policy here so changes flow through everywhere.
//
// MEMBERSHIP TIERS, DELIVERY CUTOFFS and MEMBER DISCOUNTS all live here.
// The server mirrors a small TypeScript copy in server/business.ts — keep in sync.

// ─── Pickup ──────────────────────────────────────────────────────────────────
export const PICKUP_LOCATION = "Barbershop, James Fort Building, Bridgetown";

// ─── Store timezone ──────────────────────────────────────────────────────────
// Store hours and delivery cutoffs are evaluated in the store's local time
// (Barbados — AST, UTC-4, no DST), regardless of where the customer is.
export const STORE_TIMEZONE = "America/Barbados";

// ─── Membership tiers ────────────────────────────────────────────────────────
export type MembershipTier = "standard" | "gold" | "platinum";

export type TierConfig = {
  key:                  MembershipTier;
  label:                string;     // "Standard"
  tagline:              string;     // "For occasional indulgence"
  monthlyPrice:         number;     // in store currency; 0 = free / default
  cutoffHour:           number;     // 24h
  cutoffMinute:         number;
  memberDiscountPct:    number;     // applied to subtotal at checkout (0 = none)
  perks:                string[];   // shown on the membership page
  accent:               string;     // brand colour for badge / card
};

export const TIERS: Record<MembershipTier, TierConfig> = {
  standard: {
    key:               "standard",
    label:             "Standard",
    tagline:           "Free for everyone",
    monthlyPrice:      0,
    cutoffHour:        20,            // 8:00 PM
    cutoffMinute:      30,            // :30  →  8:30 PM
    memberDiscountPct: 0,
    perks: [
      "Delivery until 8:30 PM",
      "Browse the full HD Xquisite catalogue",
      "Cash on delivery or PayPal checkout",
    ],
    accent: "#9C9C9C",
  },
  gold: {
    key:               "gold",
    label:             "Gold",
    tagline:           "For the connoisseur",
    monthlyPrice:      9.99,
    cutoffHour:        21,            // 9:30 PM
    cutoffMinute:      30,
    memberDiscountPct: 5,             // 5% off every order
    perks: [
      "Delivery until 9:30 PM",
      "5% off every order",
      "Access to GOLD15 member coupon",
      "Priority support",
    ],
    accent: "#E4A12B",
  },
  platinum: {
    key:               "platinum",
    label:             "Platinum",
    tagline:           "The Xquisite experience",
    monthlyPrice:      19.99,
    cutoffHour:        22,            // 10:30 PM
    cutoffMinute:      30,
    memberDiscountPct: 10,            // 10% off every order
    perks: [
      "Delivery until 10:30 PM",
      "10% off every order",
      "Exclusive PLATINUM20 member coupon",
      "Free standard delivery weekends",
      "Concierge support",
    ],
    accent: "#C5A572",
  },
};

export const TIER_RANK: Record<MembershipTier, number> = { standard: 0, gold: 1, platinum: 2 };

export function tierConfig(tier: MembershipTier | null | undefined): TierConfig {
  if (!tier) return TIERS.standard;
  return TIERS[tier] ?? TIERS.standard;
}

// ─── Delivery cutoff ─────────────────────────────────────────────────────────
// Evaluated in the store's timezone so the rule is identical for all customers
// regardless of their device clock.
function storeNowParts(now: Date = new Date()): { hour: number; minute: number } {
  // Use Intl to convert to the store timezone reliably (handles offset/DST).
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour   = Number(parts.find((p) => p.type === "hour")?.value   ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // "24" → "00" on some engines; clamp.
  return { hour: hour === 24 ? 0 : hour, minute };
}

export function deliveryCutoffLabelForTier(tier: MembershipTier | null | undefined): string {
  const cfg = tierConfig(tier);
  const h12 = ((cfg.cutoffHour + 11) % 12) + 1;
  const ampm = cfg.cutoffHour >= 12 ? "PM" : "AM";
  const mm = cfg.cutoffMinute.toString().padStart(2, "0");
  return `${h12}:${mm} ${ampm}`;
}

export function isDeliveryAvailableForTier(
  tier: MembershipTier | null | undefined,
  now: Date = new Date(),
): boolean {
  const cfg = tierConfig(tier);
  const { hour, minute } = storeNowParts(now);
  if (hour < cfg.cutoffHour) return true;
  if (hour > cfg.cutoffHour) return false;
  return minute < cfg.cutoffMinute;
}

// ─── Backwards-compatible defaults (Standard tier) ──────────────────────────
export const DELIVERY_CUTOFF_HOUR   = TIERS.standard.cutoffHour;
export const DELIVERY_CUTOFF_MINUTE = TIERS.standard.cutoffMinute;
export const deliveryCutoffLabel       = ()                  => deliveryCutoffLabelForTier("standard");
export const isDeliveryAvailableNow    = (now: Date = new Date()) => isDeliveryAvailableForTier("standard", now);
