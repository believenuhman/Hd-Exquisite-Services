// Server-side coupon validation. Client never decides discount values.
import { getSupabaseAdmin } from "./payment.js";
import { TIER_RANK, type MembershipTier } from "./business.js";

export type CouponRow = {
  id:             string;
  code:           string;
  description:    string | null;
  discount_type:  "percent" | "fixed" | "free_delivery";
  discount_value: number;
  min_order:      number;
  usage_limit:    number | null;
  per_user_limit: number;
  member_only:    "gold" | "platinum" | null;
  active:         boolean;
  starts_at:      string | null;
  ends_at:        string | null;
  times_used:     number;
};

let couponsTableExistsCache: boolean | null = null;
export async function couponsTableExists(): Promise<boolean> {
  if (couponsTableExistsCache !== null) return couponsTableExistsCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("coupons").select("id").limit(1);
    couponsTableExistsCache = !error;
    if (error) console.warn("[coupons] coupons table not present — coupon system disabled until supabase-membership-coupon-migration.sql is run.");
  } catch { couponsTableExistsCache = false; }
  return couponsTableExistsCache;
}

export type CouponContext = {
  code:           string;
  subtotal:       number;       // pre-discount subtotal
  deliveryFee:    number;       // current delivery fee (unaffected unless free_delivery)
  customerTier:   MembershipTier;
  userId:         string | null;
  customerPhone:  string;
};

export type CouponResolution = {
  coupon:           CouponRow;
  discountAmount:   number;     // amount taken off subtotal (>= 0); 0 for free_delivery
  freeDelivery:     boolean;    // when true, deliveryFee is set to 0
};

// Pure error subtype so route handlers can return 400 with the right text.
export class CouponError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

// Authoritative coupon validation + discount calculation.
// Throws CouponError on any invalid state. Never trusts client values.
export async function resolveCoupon(ctx: CouponContext): Promise<CouponResolution> {
  if (!(await couponsTableExists())) throw new CouponError("Coupon system is not enabled.", 503);

  const code = ctx.code.trim().toUpperCase();
  if (!code) throw new CouponError("Enter a coupon code.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .select("id,code,description,discount_type,discount_value,min_order,usage_limit,per_user_limit,member_only,active,starts_at,ends_at,times_used")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new CouponError("Failed to load coupon.", 500);
  if (!data)  throw new CouponError("That coupon code is not valid.");

  const coupon = data as CouponRow;
  if (!coupon.active) throw new CouponError("This coupon is no longer active.");

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) throw new CouponError("This coupon is not active yet.");
  if (coupon.ends_at   && new Date(coupon.ends_at).getTime()   < now) throw new CouponError("This coupon has expired.");
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
    throw new CouponError("This coupon has reached its usage limit.");
  }
  if (coupon.min_order > 0 && ctx.subtotal < coupon.min_order) {
    throw new CouponError(`Minimum order of ${coupon.min_order.toFixed(2)} required for this coupon.`);
  }

  // Tier requirement (member_only restricts to that tier OR higher).
  if (coupon.member_only) {
    const required = TIER_RANK[coupon.member_only];
    const have     = TIER_RANK[ctx.customerTier];
    if (have < required) {
      throw new CouponError(`This coupon is for ${coupon.member_only.charAt(0).toUpperCase() + coupon.member_only.slice(1)} members only.`);
    }
  }

  // Per-user-limit check. Anonymous users are matched by phone.
  if (coupon.per_user_limit > 0) {
    const usedQuery = supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);
    const { count, error: cErr } = ctx.userId
      ? await usedQuery.eq("user_id", ctx.userId)
      : await usedQuery.eq("customer_phone", ctx.customerPhone);
    if (cErr) throw new CouponError("Failed to check coupon usage.", 500);
    if ((count ?? 0) >= coupon.per_user_limit) {
      throw new CouponError("You have already used this coupon.");
    }
  }

  // Compute discount.
  let discountAmount = 0;
  let freeDelivery   = false;
  if (coupon.discount_type === "percent") {
    discountAmount = ctx.subtotal * (Number(coupon.discount_value) / 100);
  } else if (coupon.discount_type === "fixed") {
    discountAmount = Math.min(Number(coupon.discount_value), ctx.subtotal);
  } else if (coupon.discount_type === "free_delivery") {
    freeDelivery = true;
  }
  discountAmount = Math.max(0, Math.round(discountAmount * 100) / 100);

  return { coupon, discountAmount, freeDelivery };
}

// Record a coupon redemption AFTER the order row has been created. Best-effort —
// failures here are logged but never rolled back into the order.
export async function recordCouponRedemption(args: {
  coupon:         CouponRow;
  orderId:        string;
  userId:         string | null;
  customerPhone:  string;
  discountAmount: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error: insertErr } = await supabase.from("coupon_redemptions").insert({
    coupon_id:       args.coupon.id,
    coupon_code:     args.coupon.code,
    order_id:        args.orderId,
    user_id:         args.userId,
    customer_phone:  args.customerPhone,
    discount_amount: args.discountAmount,
  });
  if (insertErr) console.error("[coupons] recordCouponRedemption insert error:", insertErr);

  // Increment times_used (best-effort; not transactional with the order insert
  // — usage_limit is enforced on read so a small race here is acceptable).
  const { error: updErr } = await supabase
    .from("coupons")
    .update({ times_used: args.coupon.times_used + 1 })
    .eq("id", args.coupon.id);
  if (updErr) console.error("[coupons] increment times_used error:", updErr);
}
