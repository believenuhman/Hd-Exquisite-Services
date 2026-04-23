// Server-side mirror of web/src/lib/business.ts for tier rules.
// Keep these two files in sync — they encode the same business policy.

export type MembershipTier = "standard" | "gold" | "platinum";

export type TierConfig = {
  key:               MembershipTier;
  label:             string;
  monthlyPrice:      number;
  cutoffHour:        number;
  cutoffMinute:      number;
  memberDiscountPct: number;
};

export const TIERS: Record<MembershipTier, TierConfig> = {
  standard: { key: "standard", label: "Standard", monthlyPrice:  0,    cutoffHour: 20, cutoffMinute: 30, memberDiscountPct:  0 },
  gold:     { key: "gold",     label: "Gold",     monthlyPrice:  9.99, cutoffHour: 21, cutoffMinute: 30, memberDiscountPct:  5 },
  platinum: { key: "platinum", label: "Platinum", monthlyPrice: 19.99, cutoffHour: 22, cutoffMinute: 30, memberDiscountPct: 10 },
};

export const TIER_RANK: Record<MembershipTier, number> = { standard: 0, gold: 1, platinum: 2 };

export const STORE_TIMEZONE = "America/Barbados";

export function tierConfig(tier: MembershipTier | null | undefined): TierConfig {
  if (!tier) return TIERS.standard;
  return TIERS[tier] ?? TIERS.standard;
}

export function isMembershipTier(value: unknown): value is MembershipTier {
  return value === "standard" || value === "gold" || value === "platinum";
}

function storeNowParts(now: Date = new Date()): { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour   = Number(parts.find((p) => p.type === "hour")?.value   ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour: hour === 24 ? 0 : hour, minute };
}

export function isDeliveryAvailableForTier(tier: MembershipTier | null | undefined, now: Date = new Date()): boolean {
  const cfg = tierConfig(tier);
  const { hour, minute } = storeNowParts(now);
  if (hour < cfg.cutoffHour) return true;
  if (hour > cfg.cutoffHour) return false;
  return minute < cfg.cutoffMinute;
}

export function deliveryCutoffLabelForTier(tier: MembershipTier | null | undefined): string {
  const cfg = tierConfig(tier);
  const h12 = ((cfg.cutoffHour + 11) % 12) + 1;
  const ampm = cfg.cutoffHour >= 12 ? "PM" : "AM";
  const mm = cfg.cutoffMinute.toString().padStart(2, "0");
  return `${h12}:${mm} ${ampm}`;
}
