// Server-side membership lookup. Authoritative source of a customer's tier.
import { getSupabaseAdmin } from "./payment.js";
import { isMembershipTier, TIERS, type MembershipTier } from "./business.js";

let membershipTableExistsCache: boolean | null = null;
export async function membershipTableExists(): Promise<boolean> {
  if (membershipTableExistsCache !== null) return membershipTableExistsCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("user_memberships").select("user_id").limit(1);
    membershipTableExistsCache = !error;
    if (error) console.warn("[memberships] user_memberships table not present — membership system disabled until supabase-membership-coupon-migration.sql is run.");
  } catch { membershipTableExistsCache = false; }
  return membershipTableExistsCache;
}

export type MembershipRow = {
  user_id:                 string;
  tier:                    MembershipTier;
  status:                  "pending_payment" | "active" | "expired" | "cancelled";
  started_at:              string | null;
  expires_at:              string | null;
  payment_reference:       string | null;
  paypal_order_id:         string | null;
  amount_paid:             number | null;
  currency_code:           string | null;
  pending_paypal_order_id: string | null;
  pending_tier:            MembershipTier | null;
  pending_amount:          number | null;
  pending_currency_code:   string | null;
  pending_created_at:      string | null;
  created_at:              string;
  updated_at:              string;
};

// Returns the customer's effective tier RIGHT NOW. Anyone without an active,
// non-expired row is treated as "standard". Never throws — falls back safely.
export async function getEffectiveTier(userId: string | null | undefined): Promise<MembershipTier> {
  if (!userId) return "standard";
  if (!(await membershipTableExists())) return "standard";
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("user_memberships")
      .select("tier,status,expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return "standard";
    const row = data as { tier: string; status: string; expires_at: string | null };
    if (row.status !== "active") return "standard";
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "standard";
    return isMembershipTier(row.tier) ? row.tier : "standard";
  } catch (err) {
    console.warn("[memberships] getEffectiveTier failed; defaulting to standard:", err);
    return "standard";
  }
}

export async function getMembershipByUser(userId: string): Promise<MembershipRow | null> {
  if (!(await membershipTableExists())) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_memberships")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[memberships] getMembershipByUser error:", error);
    return null;
  }
  return (data as MembershipRow) ?? null;
}

// Look up a row whose IN-FLIGHT (pending) PayPal order id matches. We only
// match on `pending_paypal_order_id` so that an already-active member can have
// a separate pending renewal/upgrade in flight without ambiguity.
export async function getMembershipByPayPalId(paypalOrderId: string): Promise<MembershipRow | null> {
  if (!(await membershipTableExists())) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_memberships")
    .select("*")
    .eq("pending_paypal_order_id", paypalOrderId)
    .maybeSingle();
  if (error) { console.error("[memberships] getMembershipByPayPalId error:", error); return null; }
  return (data as MembershipRow) ?? null;
}

// Stash a pending PayPal order on the membership row WITHOUT touching the
// customer's currently-active tier/status/expires_at. This way, an active
// member who abandons a renewal/upgrade checkout never gets downgraded.
export async function upsertPendingMembership(args: {
  userId:        string;
  tier:          MembershipTier;
  paypalOrderId: string;
  amount:        number;
  currencyCode:  string;
}): Promise<void> {
  if (!(await membershipTableExists())) {
    throw new Error("Membership system not enabled. Apply supabase-membership-coupon-migration.sql first.");
  }
  if (!TIERS[args.tier] || args.tier === "standard") {
    throw new Error("Invalid tier for subscription.");
  }
  const supabase = getSupabaseAdmin();
  const existing = await getMembershipByUser(args.userId);
  const now = new Date().toISOString();
  const pendingFields = {
    pending_paypal_order_id: args.paypalOrderId,
    pending_tier:            args.tier,
    pending_amount:          args.amount,
    pending_currency_code:   args.currencyCode,
    pending_created_at:      now,
    updated_at:              now,
  };
  if (existing) {
    const { error } = await supabase.from("user_memberships").update(pendingFields).eq("user_id", args.userId);
    if (error) throw new Error("Failed to update pending membership: " + error.message);
  } else {
    // First-time row. Initialise with status=pending_payment + no active tier.
    const { error } = await supabase.from("user_memberships").insert({
      user_id: args.userId,
      tier:    "standard",
      status:  "pending_payment",
      ...pendingFields,
    });
    if (error) throw new Error("Failed to create pending membership: " + error.message);
  }
}

// Activate after a successful PayPal capture. Verifies the captured amount
// and currency match the pending snapshot, then promotes pending → active and
// extends expiry by 30 days (stacking on top of any remaining active period).
export async function activateMembership(args: {
  paypalOrderId: string;
  reference:     string;
  capturedAmount:   number;
  capturedCurrency: string;
}): Promise<MembershipRow> {
  const supabase = getSupabaseAdmin();
  const existing = await getMembershipByPayPalId(args.paypalOrderId);
  if (!existing) throw new Error("No pending membership found for this PayPal order.");
  if (!existing.pending_tier) throw new Error("Pending membership row is missing tier info.");

  // Integrity: captured amount/currency must match what we recorded when
  // generating the PayPal order. Anything else is a tampering signal.
  const expectedAmount = Number(existing.pending_amount ?? 0);
  const expectedCcy    = String(existing.pending_currency_code ?? "");
  const matches = Math.round(args.capturedAmount * 100) === Math.round(expectedAmount * 100)
    && args.capturedCurrency.toUpperCase() === expectedCcy.toUpperCase();
  if (!matches) {
    throw new Error(`Captured amount/currency mismatch: expected ${expectedAmount} ${expectedCcy}, got ${args.capturedAmount} ${args.capturedCurrency}.`);
  }

  const now = new Date();
  // Stack on top of any remaining active membership so an early renewal extends
  // the period rather than truncating it.
  const baseExpiry = existing.status === "active"
    && existing.expires_at
    && new Date(existing.expires_at).getTime() > now.getTime()
    ? new Date(existing.expires_at)
    : now;
  const expires = new Date(baseExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("user_memberships")
    .update({
      tier:               existing.pending_tier,
      status:             "active",
      started_at:         existing.started_at ?? now.toISOString(),
      expires_at:         expires.toISOString(),
      payment_reference:  args.reference,
      paypal_order_id:    args.paypalOrderId,
      amount_paid:        args.capturedAmount,
      currency_code:      args.capturedCurrency,
      // Clear pending fields so the same PayPal id can't be replayed.
      pending_paypal_order_id: null,
      pending_tier:            null,
      pending_amount:          null,
      pending_currency_code:   null,
      pending_created_at:      null,
      updated_at:         now.toISOString(),
    })
    .eq("user_id", existing.user_id)
    .select()
    .single();
  if (error || !data) throw new Error("Failed to activate membership: " + (error?.message ?? "unknown"));
  return data as MembershipRow;
}
