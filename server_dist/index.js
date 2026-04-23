var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/business.ts
var business_exports = {};
__export(business_exports, {
  STORE_TIMEZONE: () => STORE_TIMEZONE,
  TIERS: () => TIERS,
  TIER_RANK: () => TIER_RANK,
  deliveryCutoffLabelForTier: () => deliveryCutoffLabelForTier,
  isDeliveryAvailableForTier: () => isDeliveryAvailableForTier,
  isMembershipTier: () => isMembershipTier,
  tierConfig: () => tierConfig
});
function tierConfig(tier) {
  if (!tier) return TIERS.standard;
  return TIERS[tier] ?? TIERS.standard;
}
function isMembershipTier(value) {
  return value === "standard" || value === "gold" || value === "platinum";
}
function storeNowParts(now = /* @__PURE__ */ new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour: hour === 24 ? 0 : hour, minute };
}
function isDeliveryAvailableForTier(tier, now = /* @__PURE__ */ new Date()) {
  const cfg = tierConfig(tier);
  const { hour, minute } = storeNowParts(now);
  if (hour < cfg.cutoffHour) return true;
  if (hour > cfg.cutoffHour) return false;
  return minute < cfg.cutoffMinute;
}
function deliveryCutoffLabelForTier(tier) {
  const cfg = tierConfig(tier);
  const h12 = (cfg.cutoffHour + 11) % 12 + 1;
  const ampm = cfg.cutoffHour >= 12 ? "PM" : "AM";
  const mm = cfg.cutoffMinute.toString().padStart(2, "0");
  return `${h12}:${mm} ${ampm}`;
}
var TIERS, TIER_RANK, STORE_TIMEZONE;
var init_business = __esm({
  "server/business.ts"() {
    "use strict";
    TIERS = {
      standard: { key: "standard", label: "Standard", monthlyPrice: 0, cutoffHour: 20, cutoffMinute: 30, memberDiscountPct: 0 },
      gold: { key: "gold", label: "Gold", monthlyPrice: 9.99, cutoffHour: 21, cutoffMinute: 30, memberDiscountPct: 5 },
      platinum: { key: "platinum", label: "Platinum", monthlyPrice: 19.99, cutoffHour: 22, cutoffMinute: 30, memberDiscountPct: 10 }
    };
    TIER_RANK = { standard: 0, gold: 1, platinum: 2 };
    STORE_TIMEZONE = "America/Barbados";
  }
});

// server/memberships.ts
var memberships_exports = {};
__export(memberships_exports, {
  activateMembership: () => activateMembership,
  getEffectiveTier: () => getEffectiveTier,
  getMembershipByPayPalId: () => getMembershipByPayPalId,
  getMembershipByUser: () => getMembershipByUser,
  membershipTableExists: () => membershipTableExists,
  upsertPendingMembership: () => upsertPendingMembership
});
async function membershipTableExists() {
  if (membershipTableExistsCache !== null) return membershipTableExistsCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("user_memberships").select("user_id").limit(1);
    membershipTableExistsCache = !error;
    if (error) console.warn("[memberships] user_memberships table not present \u2014 membership system disabled until supabase-membership-coupon-migration.sql is run.");
  } catch {
    membershipTableExistsCache = false;
  }
  return membershipTableExistsCache;
}
async function getEffectiveTier(userId) {
  if (!userId) return "standard";
  if (!await membershipTableExists()) return "standard";
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("user_memberships").select("tier,status,expires_at").eq("user_id", userId).maybeSingle();
    if (error || !data) return "standard";
    const row = data;
    if (row.status !== "active") return "standard";
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "standard";
    return isMembershipTier(row.tier) ? row.tier : "standard";
  } catch (err) {
    console.warn("[memberships] getEffectiveTier failed; defaulting to standard:", err);
    return "standard";
  }
}
async function getMembershipByUser(userId) {
  if (!await membershipTableExists()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("user_memberships").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[memberships] getMembershipByUser error:", error);
    return null;
  }
  return data ?? null;
}
async function getMembershipByPayPalId(paypalOrderId) {
  if (!await membershipTableExists()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("user_memberships").select("*").eq("pending_paypal_order_id", paypalOrderId).maybeSingle();
  if (error) {
    console.error("[memberships] getMembershipByPayPalId error:", error);
    return null;
  }
  return data ?? null;
}
async function upsertPendingMembership(args) {
  if (!await membershipTableExists()) {
    throw new Error("Membership system not enabled. Apply supabase-membership-coupon-migration.sql first.");
  }
  if (!TIERS[args.tier] || args.tier === "standard") {
    throw new Error("Invalid tier for subscription.");
  }
  const supabase = getSupabaseAdmin();
  const existing = await getMembershipByUser(args.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const pendingFields = {
    pending_paypal_order_id: args.paypalOrderId,
    pending_tier: args.tier,
    pending_amount: args.amount,
    pending_currency_code: args.currencyCode,
    pending_created_at: now,
    updated_at: now
  };
  if (existing) {
    const { error } = await supabase.from("user_memberships").update(pendingFields).eq("user_id", args.userId);
    if (error) throw new Error("Failed to update pending membership: " + error.message);
  } else {
    const { error } = await supabase.from("user_memberships").insert({
      user_id: args.userId,
      tier: "standard",
      status: "pending_payment",
      ...pendingFields
    });
    if (error) throw new Error("Failed to create pending membership: " + error.message);
  }
}
async function activateMembership(args) {
  const supabase = getSupabaseAdmin();
  const existing = await getMembershipByPayPalId(args.paypalOrderId);
  if (!existing) throw new Error("No pending membership found for this PayPal order.");
  if (!existing.pending_tier) throw new Error("Pending membership row is missing tier info.");
  const expectedAmount = Number(existing.pending_amount ?? 0);
  const expectedCcy = String(existing.pending_currency_code ?? "");
  const matches = Math.round(args.capturedAmount * 100) === Math.round(expectedAmount * 100) && args.capturedCurrency.toUpperCase() === expectedCcy.toUpperCase();
  if (!matches) {
    throw new Error(`Captured amount/currency mismatch: expected ${expectedAmount} ${expectedCcy}, got ${args.capturedAmount} ${args.capturedCurrency}.`);
  }
  const now = /* @__PURE__ */ new Date();
  const baseExpiry = existing.status === "active" && existing.expires_at && new Date(existing.expires_at).getTime() > now.getTime() ? new Date(existing.expires_at) : now;
  const expires = new Date(baseExpiry.getTime() + 30 * 24 * 60 * 60 * 1e3);
  const { data, error } = await supabase.from("user_memberships").update({
    tier: existing.pending_tier,
    status: "active",
    started_at: existing.started_at ?? now.toISOString(),
    expires_at: expires.toISOString(),
    payment_reference: args.reference,
    paypal_order_id: args.paypalOrderId,
    amount_paid: args.capturedAmount,
    currency_code: args.capturedCurrency,
    // Clear pending fields so the same PayPal id can't be replayed.
    pending_paypal_order_id: null,
    pending_tier: null,
    pending_amount: null,
    pending_currency_code: null,
    pending_created_at: null,
    updated_at: now.toISOString()
  }).eq("user_id", existing.user_id).select().single();
  if (error || !data) throw new Error("Failed to activate membership: " + (error?.message ?? "unknown"));
  return data;
}
var membershipTableExistsCache;
var init_memberships = __esm({
  "server/memberships.ts"() {
    "use strict";
    init_payment();
    init_business();
    membershipTableExistsCache = null;
  }
});

// server/coupons.ts
var coupons_exports = {};
__export(coupons_exports, {
  CouponError: () => CouponError,
  couponsTableExists: () => couponsTableExists,
  recordCouponRedemption: () => recordCouponRedemption,
  resolveCoupon: () => resolveCoupon
});
async function couponsTableExists() {
  if (couponsTableExistsCache !== null) return couponsTableExistsCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("coupons").select("id").limit(1);
    couponsTableExistsCache = !error;
    if (error) console.warn("[coupons] coupons table not present \u2014 coupon system disabled until supabase-membership-coupon-migration.sql is run.");
  } catch {
    couponsTableExistsCache = false;
  }
  return couponsTableExistsCache;
}
async function resolveCoupon(ctx) {
  if (!await couponsTableExists()) throw new CouponError("Coupon system is not enabled.", 503);
  const code = ctx.code.trim().toUpperCase();
  if (!code) throw new CouponError("Enter a coupon code.");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("coupons").select("id,code,description,discount_type,discount_value,min_order,usage_limit,per_user_limit,member_only,active,starts_at,ends_at,times_used").eq("code", code).maybeSingle();
  if (error) throw new CouponError("Failed to load coupon.", 500);
  if (!data) throw new CouponError("That coupon code is not valid.");
  const coupon = data;
  if (!coupon.active) throw new CouponError("This coupon is no longer active.");
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) throw new CouponError("This coupon is not active yet.");
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) throw new CouponError("This coupon has expired.");
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
    throw new CouponError("This coupon has reached its usage limit.");
  }
  if (coupon.min_order > 0 && ctx.subtotal < coupon.min_order) {
    throw new CouponError(`Minimum order of ${coupon.min_order.toFixed(2)} required for this coupon.`);
  }
  if (coupon.member_only) {
    const required = TIER_RANK[coupon.member_only];
    const have = TIER_RANK[ctx.customerTier];
    if (have < required) {
      throw new CouponError(`This coupon is for ${coupon.member_only.charAt(0).toUpperCase() + coupon.member_only.slice(1)} members only.`);
    }
  }
  if (coupon.per_user_limit > 0) {
    const usedQuery = supabase.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", coupon.id);
    const { count, error: cErr } = ctx.userId ? await usedQuery.eq("user_id", ctx.userId) : await usedQuery.eq("customer_phone", ctx.customerPhone);
    if (cErr) throw new CouponError("Failed to check coupon usage.", 500);
    if ((count ?? 0) >= coupon.per_user_limit) {
      throw new CouponError("You have already used this coupon.");
    }
  }
  let discountAmount = 0;
  let freeDelivery = false;
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
async function recordCouponRedemption(args) {
  const supabase = getSupabaseAdmin();
  const { error: insertErr } = await supabase.from("coupon_redemptions").insert({
    coupon_id: args.coupon.id,
    coupon_code: args.coupon.code,
    order_id: args.orderId,
    user_id: args.userId,
    customer_phone: args.customerPhone,
    discount_amount: args.discountAmount
  });
  if (insertErr) console.error("[coupons] recordCouponRedemption insert error:", insertErr);
  const { error: updErr } = await supabase.from("coupons").update({ times_used: args.coupon.times_used + 1 }).eq("id", args.coupon.id);
  if (updErr) console.error("[coupons] increment times_used error:", updErr);
}
var couponsTableExistsCache, CouponError;
var init_coupons = __esm({
  "server/coupons.ts"() {
    "use strict";
    init_payment();
    init_business();
    couponsTableExistsCache = null;
    CouponError = class extends Error {
      status;
      constructor(message, status = 400) {
        super(message);
        this.status = status;
      }
    };
  }
});

// server/inventory.ts
var inventory_exports = {};
__export(inventory_exports, {
  checkPickupStock: () => checkPickupStock,
  decrementStockForOrder: () => decrementStockForOrder,
  getLocationById: () => getLocationById,
  getLocationBySlug: () => getLocationBySlug,
  inventoryTablesExist: () => inventoryTablesExist,
  listCategories: () => listCategories,
  listInventory: () => listInventory,
  listLocations: () => listLocations,
  locationAvailability: () => locationAvailability,
  orderPickupLocationColExists: () => orderPickupLocationColExists,
  upsertStock: () => upsertStock
});
async function inventoryTablesExist() {
  if (inventoryTablesExistCache !== null) return inventoryTablesExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("pickup_locations").select("id").limit(1);
    inventoryTablesExistCache = !error;
    if (error) console.warn("[inventory] pickup_locations table missing \u2014 apply supabase-inventory-migration.sql.");
  } catch {
    inventoryTablesExistCache = false;
  }
  return inventoryTablesExistCache;
}
async function productHasSize() {
  if (productSizeColCache !== null) return productSizeColCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("products").select("size").limit(1);
    productSizeColCache = !error;
  } catch {
    productSizeColCache = false;
  }
  return productSizeColCache;
}
async function orderPickupLocationColExists() {
  if (orderPickupLocationColCache !== null) return orderPickupLocationColCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("pickup_location_id").limit(1);
    orderPickupLocationColCache = !error;
  } catch {
    orderPickupLocationColCache = false;
  }
  return orderPickupLocationColCache;
}
async function listLocations(activeOnly = false) {
  if (!await inventoryTablesExist()) return [];
  const supabase = getSupabaseAdmin();
  let q = supabase.from("pickup_locations").select("id,slug,name,address,is_active").order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
async function getLocationBySlug(slug) {
  if (!await inventoryTablesExist()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("pickup_locations").select("id,slug,name,address,is_active").eq("slug", slug).maybeSingle();
  if (error) return null;
  return data ?? null;
}
async function getLocationById(id) {
  if (!await inventoryTablesExist()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("pickup_locations").select("id,slug,name,address,is_active").eq("id", id).maybeSingle();
  if (error) return null;
  return data ?? null;
}
async function listInventory(opts) {
  if (!await inventoryTablesExist()) return [];
  const supabase = getSupabaseAdmin();
  let restrictLocationIds = null;
  if (opts.locationSlug) {
    const loc = await getLocationBySlug(opts.locationSlug);
    if (!loc) return [];
    restrictLocationIds = [loc.id];
  }
  let stockQuery = supabase.from("product_stock").select("product_id,location_id,quantity,low_stock_threshold,updated_at");
  if (restrictLocationIds) stockQuery = stockQuery.in("location_id", restrictLocationIds);
  const { data: stock, error: stockErr } = await stockQuery;
  if (stockErr) throw stockErr;
  const productIds = [...new Set((stock ?? []).map((r) => r.product_id))];
  const locIds = [...new Set((stock ?? []).map((r) => r.location_id))];
  const productCols = await productHasSize() ? "id,name,image_url,category,price,size,is_active" : "id,name,image_url,category,price,is_active";
  const [productsRes, locsRes] = await Promise.all([
    productIds.length ? supabase.from("products").select(productCols).in("id", productIds) : Promise.resolve({ data: [] }),
    locIds.length ? supabase.from("pickup_locations").select("id,slug,name").in("id", locIds) : Promise.resolve({ data: [] })
  ]);
  const productById = new Map((productsRes.data ?? []).map((p) => [p.id, p]));
  const locById = new Map((locsRes.data ?? []).map((l) => [l.id, l]));
  const qLower = (opts.q ?? "").trim().toLowerCase();
  const cat = (opts.category ?? "").trim().toLowerCase();
  const rows = [];
  for (const r of stock ?? []) {
    const p = productById.get(r.product_id);
    const l = locById.get(r.location_id);
    if (!p || !l) continue;
    if (p.is_active === false) continue;
    if (cat && (p.category ?? "").toLowerCase() !== cat) continue;
    if (qLower && !p.name.toLowerCase().includes(qLower)) continue;
    const qty = Number(r.quantity ?? 0);
    const thr = Number(r.low_stock_threshold ?? 0);
    const status = qty <= 0 ? "out" : qty <= thr ? "low" : "in_stock";
    if (opts.lowStockOnly && status === "in_stock") continue;
    rows.push({
      product_id: p.id,
      product_name: p.name,
      product_image: p.image_url,
      product_category: p.category,
      product_size: p.size ?? null,
      product_price: Number(p.price ?? 0),
      location_id: l.id,
      location_slug: l.slug,
      location_name: l.name,
      quantity: qty,
      low_stock_threshold: thr,
      status,
      updated_at: r.updated_at
    });
  }
  rows.sort(
    (a, b) => a.product_name.localeCompare(b.product_name) || a.location_name.localeCompare(b.location_name)
  );
  return rows;
}
async function upsertStock(opts) {
  if (!await inventoryTablesExist()) {
    throw new Error("Inventory not enabled. Apply supabase-inventory-migration.sql.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(opts.productId)) throw new Error("Invalid productId.");
  if (!/^[0-9a-f-]{36}$/i.test(opts.locationId)) throw new Error("Invalid locationId.");
  const patch = {
    product_id: opts.productId,
    location_id: opts.locationId
  };
  if (typeof opts.quantity === "number" && Number.isFinite(opts.quantity)) {
    patch.quantity = Math.max(0, Math.floor(opts.quantity));
  }
  if (typeof opts.lowStockThreshold === "number" && Number.isFinite(opts.lowStockThreshold)) {
    patch.low_stock_threshold = Math.max(0, Math.floor(opts.lowStockThreshold));
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("product_stock").upsert(patch, { onConflict: "product_id,location_id" });
  if (error) throw error;
  const all = await listInventory({});
  return all.find((r) => r.product_id === opts.productId && r.location_id === opts.locationId) ?? null;
}
async function checkPickupStock(locationId, items) {
  if (!await inventoryTablesExist()) {
    return "Per-location inventory is not enabled. Please apply supabase-inventory-migration.sql.";
  }
  const supabase = getSupabaseAdmin();
  const wanted = /* @__PURE__ */ new Map();
  for (const it of items) {
    const q = Number(it.quantity ?? 0);
    if (!it.product_id || !Number.isFinite(q) || q <= 0) continue;
    wanted.set(it.product_id, (wanted.get(it.product_id) ?? 0) + q);
  }
  const ids = [...wanted.keys()];
  if (ids.length === 0) return null;
  const [stockRes, prodRes] = await Promise.all([
    supabase.from("product_stock").select("product_id,quantity").eq("location_id", locationId).in("product_id", ids),
    supabase.from("products").select("id,name").in("id", ids)
  ]);
  const stockMap = new Map(
    (stockRes.data ?? []).map((s) => [s.product_id, Number(s.quantity ?? 0)])
  );
  const nameMap = new Map(
    (prodRes.data ?? []).map((p) => [p.id, p.name])
  );
  for (const [productId, want] of wanted) {
    const have = stockMap.get(productId) ?? 0;
    const name = nameMap.get(productId) ?? "Item";
    if (have <= 0) {
      return `"${name}" is out of stock at the selected pickup location.`;
    }
    if (want > have) {
      return `Only ${have} of "${name}" available at the selected pickup location; you requested ${want}.`;
    }
  }
  return null;
}
async function decrementStockForOrder(orderId) {
  if (!await inventoryTablesExist()) return;
  if (!await orderPickupLocationColExists()) return;
  const supabase = getSupabaseAdmin();
  const { data: orderRow } = await supabase.from("orders").select("id,pickup_location_id,fulfillment_method,stock_decremented_at").eq("id", orderId).maybeSingle();
  const order = orderRow;
  if (!order) return;
  if (order.fulfillment_method !== "pickup" || !order.pickup_location_id) return;
  if (order.stock_decremented_at) return;
  const { data: items } = await supabase.from("order_items").select("product_id,qty").eq("order_id", orderId);
  const totals = /* @__PURE__ */ new Map();
  for (const it of items ?? []) {
    if (!it.product_id || !it.qty || it.qty <= 0) continue;
    totals.set(it.product_id, (totals.get(it.product_id) ?? 0) + Number(it.qty));
  }
  let allApplied = true;
  for (const [productId, qty] of totals) {
    const { data, error } = await supabase.rpc("decrement_stock_for_pickup", {
      p_product_id: productId,
      p_location_id: order.pickup_location_id,
      p_qty: qty
    });
    if (error) {
      console.error(`[inventory] decrement RPC error order=${orderId} product=${productId}:`, error);
      allApplied = false;
      continue;
    }
    const remaining = data ?? null;
    if (remaining === -1) {
      console.error(`[inventory] OVERSELL on order=${orderId} product=${productId} qty=${qty} \u2014 insufficient stock at location ${order.pickup_location_id}. Manual reconciliation required.`);
      allApplied = false;
    } else if (remaining === null) {
      console.error(`[inventory] decrement skipped \u2014 no product_stock row for order=${orderId} product=${productId} location=${order.pickup_location_id}.`);
      allApplied = false;
    }
  }
  if (allApplied) {
    await supabase.from("orders").update({ stock_decremented_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", orderId);
  }
}
async function locationAvailability(slugOrId) {
  if (!await inventoryTablesExist()) return {};
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const loc = isUuid ? await getLocationById(slugOrId) : await getLocationBySlug(slugOrId);
  if (!loc) return {};
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("product_stock").select("product_id,quantity").eq("location_id", loc.id);
  const out = {};
  for (const r of data ?? []) {
    out[r.product_id] = Number(r.quantity ?? 0);
  }
  return out;
}
async function listCategories() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("products").select("category").not("category", "is", null);
  const set = /* @__PURE__ */ new Set();
  for (const r of data ?? []) {
    if (r.category && r.category.trim()) set.add(r.category.trim());
  }
  return [...set].sort();
}
var inventoryTablesExistCache, productSizeColCache, orderPickupLocationColCache;
var init_inventory = __esm({
  "server/inventory.ts"() {
    "use strict";
    init_payment();
    inventoryTablesExistCache = null;
    productSizeColCache = null;
    orderPickupLocationColCache = null;
  }
});

// server/payment.ts
var payment_exports = {};
__export(payment_exports, {
  bindPayPalOrderId: () => bindPayPalOrderId,
  capturePayPalOrder: () => capturePayPalOrder,
  createPayPalOrder: () => createPayPalOrder,
  createServerOrder: () => createServerOrder,
  fulfillmentColumnsExist: () => fulfillmentColumnsExist,
  getOrderById: () => getOrderById,
  getOrderByPayPalId: () => getOrderByPayPalId,
  getPayPalAccessToken: () => getPayPalAccessToken,
  getPayPalBase: () => getPayPalBase,
  getSupabaseAdmin: () => getSupabaseAdmin,
  isPayPalConfigured: () => isPayPalConfigured,
  orderMembershipColumnsExist: () => orderMembershipColumnsExist,
  updateOrderCancelled: () => updateOrderCancelled,
  updateOrderFailed: () => updateOrderFailed,
  updateOrderPaid: () => updateOrderPaid
});
import { createClient } from "@supabase/supabase-js";
function getSupabaseAdmin() {
  if (!SUPABASE_URL)
    throw new Error("Supabase URL not configured. Set SUPABASE_URL (or VITE_SUPABASE_URL).");
  if (!SUPABASE_SERVICE_KEY)
    throw new Error("Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in Replit Secrets.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
function getPayPalBase() {
  return PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
function isPayPalConfigured() {
  return Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}
async function getPayPalAccessToken() {
  if (!isPayPalConfigured()) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal token request failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}
async function createPayPalOrder(req) {
  const accessToken = await getPayPalAccessToken();
  const value = Number(req.amount).toFixed(2);
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: req.orderId,
        description: req.description || "HD Xquisite Liquors Order",
        amount: {
          currency_code: req.currency.toUpperCase(),
          value
        }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: req.returnUrl,
          cancel_url: req.cancelUrl
        }
      }
    }
  };
  const res = await fetch(`${getPayPalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `hd-${req.orderId}-${Date.now()}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const approvalUrl = data.links.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? "";
  if (!approvalUrl) {
    throw new Error("PayPal did not return an approval URL");
  }
  console.log(`[paypal] Order created: ${data.id} \u2192 ${approvalUrl}`);
  return { paypalOrderId: data.id, approvalUrl };
}
async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${getPayPalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const captureId = capture?.id ?? paypalOrderId;
  const success = data.status === "COMPLETED" || capture?.status === "COMPLETED";
  const amount = Number(capture?.amount?.value ?? 0);
  const currency = (capture?.amount?.currency_code ?? "").toUpperCase();
  const referenceId = unit?.reference_id ?? "";
  console.log(`[paypal] Captured ${paypalOrderId}: status=${data.status}, captureId=${captureId}, amount=${amount} ${currency}, ref=${referenceId}`);
  return { success, captureId, status: data.status, amount, currency, referenceId };
}
async function updateOrderPaid(orderId, reference, gateway) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders").update({
    payment_status: "paid",
    payment_reference: reference,
    gateway_name: gateway,
    paid_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", orderId);
  if (error) {
    console.error("[payment] updateOrderPaid error:", error);
    throw new Error("Failed to mark order paid: " + error.message);
  }
}
async function updateOrderCancelled(orderId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders").update({ payment_status: "cancelled" }).eq("id", orderId).eq("payment_status", "pending");
  if (error) {
    console.error("[payment] updateOrderCancelled error:", error);
    throw new Error("Failed to cancel order: " + error.message);
  }
}
async function updateOrderFailed(orderId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId).eq("payment_status", "pending");
  if (error) {
    console.error("[payment] updateOrderFailed error:", error);
    throw new Error("Failed to fail order: " + error.message);
  }
}
async function getOrderByPayPalId(paypalOrderId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").select("id,total,currency_code,payment_status,payment_method,paypal_order_id").eq("paypal_order_id", paypalOrderId).maybeSingle();
  if (error) {
    console.error("[payment] getOrderByPayPalId error:", error);
    return null;
  }
  return data ?? null;
}
async function getOrderById(orderId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").select("id,total,currency_code,payment_status,payment_method,paypal_order_id").eq("id", orderId).maybeSingle();
  if (error) {
    console.error("[payment] getOrderById error:", error);
    return null;
  }
  return data ?? null;
}
async function bindPayPalOrderId(orderId, paypalOrderId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", orderId).is("paypal_order_id", null).select("id").maybeSingle();
  if (error) {
    console.error("[payment] bindPayPalOrderId error:", error);
    throw new Error("Failed to bind PayPal order ID: " + error.message);
  }
  if (!data) {
    const existing = await getOrderById(orderId);
    if (!existing) throw new Error("Order not found when attempting to bind PayPal order.");
    if (existing.paypal_order_id && existing.paypal_order_id !== paypalOrderId) {
      console.warn(
        `[paypal] BIND_CONFLICT orderId=${orderId} existingPaypalId=${existing.paypal_order_id} attemptedPaypalId=${paypalOrderId}`
      );
      throw new Error("Order is already bound to a different PayPal payment session.");
    }
    console.log(`[paypal] bindPayPalOrderId idempotent: orderId=${orderId} paypalOrderId=${paypalOrderId}`);
  }
}
async function fulfillmentColumnsExist() {
  if (fulfillmentColumnsExistCache !== null) return fulfillmentColumnsExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("fulfillment_method").limit(1);
    fulfillmentColumnsExistCache = !error;
    if (error) {
      console.warn("[payment] fulfillment columns NOT present \u2014 pickup mode disabled until supabase-fulfillment-migration.sql is run.");
    }
  } catch {
    fulfillmentColumnsExistCache = false;
  }
  return fulfillmentColumnsExistCache;
}
async function createServerOrder(input) {
  const supabase = getSupabaseAdmin();
  const hasFulfillmentCols = await fulfillmentColumnsExist();
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }
  const cleanItems = input.items.map((it) => ({
    product_id: String(it.product_id ?? "").trim(),
    quantity: Math.max(0, Math.floor(Number(it.quantity ?? 0)))
  })).filter((it) => it.product_id && it.quantity > 0);
  if (cleanItems.length === 0) throw new Error("All items have zero quantity.");
  const productIds = [...new Set(cleanItems.map((it) => it.product_id))];
  const { data: products, error: prodErr } = await supabase.from("products").select("id,name,price,stock_qty").in("id", productIds);
  if (prodErr) throw new Error("Failed to load products: " + prodErr.message);
  if (!products || products.length === 0) throw new Error("No matching products found.");
  const priceById = /* @__PURE__ */ new Map();
  for (const p of products) {
    priceById.set(p.id, { name: p.name, price: Number(p.price ?? 0), stock_qty: Number(p.stock_qty ?? 0) });
  }
  const isPickupOrder = input.fulfillment_method === "pickup";
  if (!isPickupOrder) {
    for (const it of cleanItems) {
      const p = priceById.get(it.product_id);
      if (!p) {
        throw new Error(`Product ${it.product_id} is not available.`);
      }
      if (p.stock_qty <= 0) {
        throw new Error(`"${p.name}" is out of stock.`);
      }
      if (it.quantity > p.stock_qty) {
        throw new Error(`Only ${p.stock_qty} of "${p.name}" available; you requested ${it.quantity}.`);
      }
    }
  } else {
    for (const it of cleanItems) {
      if (!priceById.get(it.product_id)) {
        throw new Error(`Product ${it.product_id} is not available.`);
      }
    }
  }
  let subtotal = 0;
  for (const it of cleanItems) {
    const p = priceById.get(it.product_id);
    subtotal += p.price * it.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const fulfillmentMethod = input.fulfillment_method === "pickup" ? "pickup" : "delivery";
  if (fulfillmentMethod === "pickup" && !hasFulfillmentCols) {
    throw new Error("Pickup is not available yet. Please run supabase-fulfillment-migration.sql in Supabase SQL Editor to enable it.");
  }
  let deliveryFee = 0;
  if (fulfillmentMethod === "delivery") {
    if (input.zone_id) {
      const { data: zone, error: zoneErr } = await supabase.from("delivery_zones").select("fee,is_active").eq("id", input.zone_id).maybeSingle();
      if (zoneErr) throw new Error("Failed to load delivery zone: " + zoneErr.message);
      if (!zone || zone.is_active === false) throw new Error("Selected delivery zone is not available.");
      deliveryFee = Number(zone.fee ?? 0);
    } else {
      const { data: settings } = await supabase.from("settings").select("flat_fee").limit(1).maybeSingle();
      deliveryFee = Number(settings?.flat_fee ?? 0);
    }
  }
  deliveryFee = Math.round(deliveryFee * 100) / 100;
  const { data: settingsRow } = await supabase.from("settings").select("currency_code,currency_symbol").limit(1).maybeSingle();
  const currencyCode = settingsRow?.currency_code ?? "USD";
  const currencySymbol = settingsRow?.currency_symbol ?? "$";
  const { getEffectiveTier: getEffectiveTier2 } = await Promise.resolve().then(() => (init_memberships(), memberships_exports));
  const { resolveCoupon: resolveCoupon2, recordCouponRedemption: recordCouponRedemption2 } = await Promise.resolve().then(() => (init_coupons(), coupons_exports));
  const { tierConfig: tierConfig2, isDeliveryAvailableForTier: isDeliveryAvailableForTier2, deliveryCutoffLabelForTier: deliveryCutoffLabelForTier2 } = await Promise.resolve().then(() => (init_business(), business_exports));
  const membershipTier = await getEffectiveTier2(input.user_id ?? null);
  const tierCfg = tierConfig2(membershipTier);
  if (fulfillmentMethod === "delivery" && !isDeliveryAvailableForTier2(membershipTier)) {
    throw new Error(
      `Delivery is closed for today (${tierCfg.label} cutoff is ${deliveryCutoffLabelForTier2(membershipTier)}). Please choose Pick Up or order again tomorrow.`
    );
  }
  const membershipDiscount = Math.round(subtotal * tierCfg.memberDiscountPct / 100 * 100) / 100;
  let couponDiscount = 0;
  let couponCode = null;
  let resolvedCoupon = null;
  if (input.coupon_code && input.coupon_code.trim()) {
    resolvedCoupon = await resolveCoupon2({
      code: input.coupon_code,
      subtotal: Math.max(0, subtotal - membershipDiscount),
      // coupon applies to discounted subtotal
      deliveryFee,
      customerTier: membershipTier,
      userId: input.user_id ?? null,
      customerPhone: String(input.customer_phone ?? "").trim()
    });
    couponCode = resolvedCoupon.coupon.code;
    if (resolvedCoupon.freeDelivery) {
      deliveryFee = 0;
    } else {
      couponDiscount = Math.round(resolvedCoupon.discountAmount * 100) / 100;
    }
  }
  const totalDiscount = Math.round((membershipDiscount + couponDiscount) * 100) / 100;
  const subtotalAfter = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
  const total = Math.round((subtotalAfter + deliveryFee) * 100) / 100;
  const trimmedAddress = String(input.delivery_address ?? "").trim();
  const orderRow = {
    customer_name: String(input.customer_name ?? "").trim(),
    customer_phone: String(input.customer_phone ?? "").trim(),
    delivery_address: fulfillmentMethod === "pickup" ? null : trimmedAddress,
    delivery_notes: input.delivery_notes ? String(input.delivery_notes).trim() : null,
    age_confirmed: true,
    status: "received",
    subtotal,
    delivery_fee: deliveryFee,
    total,
    currency_code: currencyCode,
    currency_symbol: currencySymbol,
    zone_id: fulfillmentMethod === "pickup" ? null : input.zone_id ?? null,
    payment_method: input.payment_method,
    payment_status: "pending",
    gateway_name: input.payment_method === "online_card" ? "paypal" : null
  };
  if (hasFulfillmentCols) {
    orderRow.fulfillment_method = fulfillmentMethod;
    orderRow.pickup_location = fulfillmentMethod === "pickup" ? input.pickup_location ?? null : null;
  }
  const { inventoryTablesExist: inventoryTablesExist2, orderPickupLocationColExists: orderPickupLocationColExists2, getLocationById: getLocationById2, checkPickupStock: checkPickupStock2 } = await Promise.resolve().then(() => (init_inventory(), inventory_exports));
  if (fulfillmentMethod === "pickup" && await inventoryTablesExist2()) {
    const locId = (input.pickup_location_id ?? "").trim();
    if (!locId) {
      throw new Error("Please choose a pickup location.");
    }
    const loc = await getLocationById2(locId);
    if (!loc || !loc.is_active) {
      throw new Error("Selected pickup location is not available.");
    }
    const stockErr = await checkPickupStock2(loc.id, cleanItems);
    if (stockErr) throw new Error(stockErr);
    if (await orderPickupLocationColExists2()) {
      orderRow.pickup_location_id = loc.id;
    }
    if (hasFulfillmentCols) {
      orderRow.pickup_location = loc.address || loc.name;
    }
  }
  const hasMembershipCols = await orderMembershipColumnsExist();
  if (hasMembershipCols) {
    orderRow.user_id = input.user_id ?? null;
    orderRow.membership_tier = membershipTier;
    orderRow.membership_discount = membershipDiscount;
    orderRow.coupon_code = couponCode;
    orderRow.coupon_discount = couponDiscount;
    orderRow.total_discount = totalDiscount;
  }
  const insertRes = await supabase.from("orders").insert(orderRow).select().single();
  if (insertRes.error) throw new Error("Failed to create order: " + insertRes.error.message);
  const order = insertRes.data;
  const orderItems = cleanItems.map((it) => {
    const p = priceById.get(it.product_id);
    return {
      order_id: order.id,
      product_id: it.product_id,
      name: p.name,
      qty: it.quantity,
      unit_price: p.price
    };
  });
  const itemsRes = await supabase.from("order_items").insert(orderItems);
  if (itemsRes.error) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error("Failed to create order items: " + itemsRes.error.message);
  }
  if (resolvedCoupon) {
    try {
      await recordCouponRedemption2({
        coupon: resolvedCoupon.coupon,
        orderId: order.id,
        userId: input.user_id ?? null,
        customerPhone: String(input.customer_phone ?? "").trim(),
        discountAmount: resolvedCoupon.freeDelivery ? 0 : couponDiscount
      });
    } catch (e) {
      console.error("[order] coupon redemption record failed (non-fatal):", e);
    }
  }
  return {
    orderId: order.id,
    subtotal,
    deliveryFee,
    total,
    currencyCode,
    membershipTier,
    membershipDiscount,
    couponCode,
    couponDiscount,
    totalDiscount
  };
}
async function orderMembershipColumnsExist() {
  if (orderMembershipColumnsExistCache !== null) return orderMembershipColumnsExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("membership_tier").limit(1);
    orderMembershipColumnsExistCache = !error;
    if (error) console.warn("[payment] orders.membership_tier missing \u2014 apply supabase-membership-coupon-migration.sql to enable per-order membership/coupon snapshots.");
  } catch {
    orderMembershipColumnsExistCache = false;
  }
  return orderMembershipColumnsExistCache;
}
var SUPABASE_URL, SUPABASE_SERVICE_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV, fulfillmentColumnsExistCache, orderMembershipColumnsExistCache;
var init_payment = __esm({
  "server/payment.ts"() {
    "use strict";
    SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
    SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
    PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
    PAYPAL_ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase().trim();
    fulfillmentColumnsExistCache = null;
    orderMembershipColumnsExistCache = null;
  }
});

// server/index.ts
import express from "express";

// server/routes.ts
init_payment();
init_coupons();
init_memberships();
init_business();
import { createServer } from "node:http";

// server/auth.ts
init_payment();
async function getAuthedUserId(req) {
  const user = await getAuthedUser(req);
  return user?.id ?? null;
}
async function getAuthedUser(req) {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    const meta = data.user.app_metadata ?? {};
    const role = typeof meta.role === "string" ? meta.role : null;
    const location = typeof meta.location === "string" ? meta.location : null;
    return { id: data.user.id, role, location };
  } catch (err) {
    console.warn("[auth] getAuthedUser failed:", err);
    return null;
  }
}
async function requireAdmin(req) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "admin") return null;
  return user.id;
}
async function getAdminContext(req) {
  const user = await getAuthedUser(req);
  if (!user) return null;
  if (user.role === "admin") {
    return { userId: user.id, role: "admin", locationSlug: null };
  }
  if (user.role === "location_admin" && user.location && /^[a-z0-9_]+$/.test(user.location)) {
    return { userId: user.id, role: "location_admin", locationSlug: user.location };
  }
  return null;
}

// server/admin.ts
init_payment();
async function getOrderLocationId(orderId) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return void 0;
  const supabase = getSupabaseAdmin();
  const inv = await Promise.resolve().then(() => (init_inventory(), inventory_exports));
  if (!await inv.orderPickupLocationColExists()) return null;
  const { data, error } = await supabase.from("orders").select("pickup_location_id").eq("id", orderId).maybeSingle();
  if (error || !data) return void 0;
  return data.pickup_location_id ?? null;
}
var ADMIN_ORDER_STATUSES = [
  "received",
  "confirmed",
  "packing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "refused"
];
var BASE_COLS = "id,status,customer_name,customer_phone,delivery_address,delivery_notes,subtotal,delivery_fee,total,currency_code,currency_symbol,created_at,payment_method,payment_status,payment_reference,paid_at,zone_id";
var EXTENDED_COLS = BASE_COLS + ",fulfillment_method,pickup_location";
async function selectCols() {
  const mod = await Promise.resolve().then(() => (init_payment(), payment_exports));
  let cols = await mod.fulfillmentColumnsExist() ? EXTENDED_COLS : BASE_COLS;
  const inv = await Promise.resolve().then(() => (init_inventory(), inventory_exports));
  if (await inv.orderPickupLocationColExists()) cols += ",pickup_location_id";
  return cols;
}
async function listOrders(f) {
  const supabase = getSupabaseAdmin();
  const cols = await selectCols();
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200);
  const offset = Math.max(f.offset ?? 0, 0);
  let query = supabase.from("orders").select(cols, { count: "exact" });
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.payment && f.payment !== "all") query = query.eq("payment_status", f.payment);
  if (f.fulfillment && f.fulfillment !== "all") query = query.eq("fulfillment_method", f.fulfillment);
  if (f.locationId) {
    query = query.eq("pickup_location_id", f.locationId);
  }
  if (f.date) {
    const start = `${f.date}T00:00:00.000Z`;
    const endDate = /* @__PURE__ */ new Date(`${f.date}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString();
    query = query.gte("created_at", start).lt("created_at", end);
  }
  const q = (f.q ?? "").trim();
  if (q) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(q);
    const escaped = q.replace(/[%,]/g, " ");
    const filters = [
      `customer_name.ilike.%${escaped}%`,
      `customer_phone.ilike.%${escaped}%`
    ];
    if (isUuid) filters.push(`id.eq.${q}`);
    query = query.or(filters.join(","));
  }
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0 };
}
async function getOrderDetail(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = getSupabaseAdmin();
  const cols = await selectCols();
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select(cols + ",coupon_code,coupon_discount,membership_tier,membership_discount,refusal_reason").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id,product_id,name,qty,unit_price").eq("order_id", id)
  ]);
  if (orderRes.error) {
    const fallback = await supabase.from("orders").select(cols + ",refusal_reason").eq("id", id).maybeSingle();
    if (fallback.error) throw fallback.error;
    if (!fallback.data) return null;
    return { order: fallback.data, items: itemsRes.data ?? [] };
  }
  if (!orderRes.data) return null;
  return { order: orderRes.data, items: itemsRes.data ?? [] };
}
async function updateOrderStatus(id, status) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("id,status").maybeSingle();
  if (error) throw error;
  return data;
}
async function updatePaymentStatus(id, payment_status) {
  const supabase = getSupabaseAdmin();
  const patch = { payment_status };
  if (payment_status === "paid") patch.paid_at = (/* @__PURE__ */ new Date()).toISOString();
  const { data, error } = await supabase.from("orders").update(patch).eq("id", id).select("id,payment_status,paid_at").maybeSingle();
  if (error) throw error;
  return data;
}
async function todayStats(opts = {}) {
  const supabase = getSupabaseAdmin();
  const start = /* @__PURE__ */ new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  let query = supabase.from("orders").select("status,payment_status,total,currency_symbol").gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  if (opts.locationId) query = query.eq("pickup_location_id", opts.locationId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  let total_orders = 0, pending_orders = 0, completed_orders = 0;
  let total_sales = 0, paid_sales = 0;
  let currency_symbol = "$";
  for (const r of rows) {
    total_orders += 1;
    total_sales += Number(r.total) || 0;
    if (r.currency_symbol) currency_symbol = r.currency_symbol;
    if (r.status === "delivered") completed_orders += 1;
    else if (r.status !== "refused") pending_orders += 1;
    if (r.payment_status === "paid") paid_sales += Number(r.total) || 0;
  }
  return { total_orders, pending_orders, completed_orders, total_sales, paid_sales, currency_symbol };
}

// server/routes.ts
init_inventory();
function amountsMatch(a, b) {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}
var rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(key, limit = 10, windowMs = 6e4) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      paypal: isPayPalConfigured() ? "configured" : "not configured"
    });
  });
  app2.get("/api/paypal/config", (_req, res) => {
    res.json({
      configured: isPayPalConfigured(),
      environment: (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase()
    });
  });
  app2.get("/api/memberships/me", async (req, res) => {
    try {
      const userId = await getAuthedUserId(req);
      if (!userId) return res.json({ tier: "standard", membership: null });
      const [tier, membership] = await Promise.all([
        getEffectiveTier(userId),
        getMembershipByUser(userId)
      ]);
      return res.json({ tier, membership });
    } catch (err) {
      console.error("[GET /api/memberships/me]", err);
      return res.json({ tier: "standard", membership: null });
    }
  });
  app2.post("/api/memberships/subscribe", async (req, res) => {
    try {
      const userId = await getAuthedUserId(req);
      if (!userId) return res.status(401).json({ error: "Sign in required to subscribe." });
      const { tier, origin } = req.body;
      if (!tier || !origin) return res.status(400).json({ error: "Missing tier or origin." });
      if (!isMembershipTier(tier) || tier === "standard") return res.status(400).json({ error: "Invalid tier." });
      if (!isPayPalConfigured()) return res.status(503).json({ error: "PayPal is not configured." });
      if (!await membershipTableExists()) return res.status(503).json({ error: "Membership system not enabled. Apply supabase-membership-coupon-migration.sql first." });
      const cfg = TIERS[tier];
      const supabase = getSupabaseAdmin();
      const { data: s } = await supabase.from("settings").select("currency_code").limit(1).maybeSingle();
      const currency = s?.currency_code ?? "USD";
      const ref = `mem-${userId.slice(0, 8)}-${Date.now()}`;
      const result = await createPayPalOrder({
        orderId: ref,
        amount: cfg.monthlyPrice,
        currency,
        description: `HD Xquisite ${cfg.label} Membership \u2014 30 days`,
        returnUrl: `${origin}/payment-success`,
        cancelUrl: `${origin}/payment-cancelled`
      });
      await upsertPendingMembership({
        userId,
        tier,
        paypalOrderId: result.paypalOrderId,
        amount: cfg.monthlyPrice,
        currencyCode: currency
      });
      return res.json({ paypalOrderId: result.paypalOrderId, approvalUrl: result.approvalUrl, kind: "membership" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start membership.";
      console.error("[POST /api/memberships/subscribe]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, subtotal, delivery_fee, customer_phone } = req.body;
      if (!code || typeof subtotal !== "number") {
        return res.status(400).json({ error: "Missing code or subtotal." });
      }
      if (!await couponsTableExists()) {
        return res.status(503).json({ error: "Coupon system not enabled. Apply supabase-membership-coupon-migration.sql first." });
      }
      const authedUserId = await getAuthedUserId(req);
      const tier = await getEffectiveTier(authedUserId);
      const cfg = (await Promise.resolve().then(() => (init_business(), business_exports))).tierConfig(tier);
      const memberDiscount = Math.round(subtotal * cfg.memberDiscountPct / 100 * 100) / 100;
      const result = await resolveCoupon({
        code,
        subtotal: Math.max(0, subtotal - memberDiscount),
        deliveryFee: Number(delivery_fee ?? 0),
        customerTier: tier,
        userId: authedUserId,
        customerPhone: String(customer_phone ?? "")
      });
      return res.json({
        ok: true,
        code: result.coupon.code,
        description: result.coupon.description,
        discount_type: result.coupon.discount_type,
        discount_value: result.coupon.discount_value,
        coupon_discount: result.freeDelivery ? 0 : result.discountAmount,
        free_delivery: result.freeDelivery,
        membership_tier: tier,
        membership_discount: memberDiscount
      });
    } catch (err) {
      if (err instanceof CouponError) return res.status(err.status).json({ error: err.message });
      console.error("[POST /api/coupons/validate]", err);
      return res.status(500).json({ error: "Failed to validate coupon." });
    }
  });
  app2.post("/api/orders/create", async (req, res) => {
    try {
      const body = req.body;
      const authedUserId = await getAuthedUserId(req);
      const fulfillment = body.fulfillment_method === "pickup" ? "pickup" : "delivery";
      const method = fulfillment === "pickup" ? "online_card" : body.payment_method === "online_card" ? "online_card" : "cash_on_delivery";
      if (!body.customer_name?.trim()) return res.status(400).json({ error: "Name is required." });
      if (!body.customer_phone?.trim()) return res.status(400).json({ error: "Phone is required." });
      if (fulfillment === "delivery" && !body.delivery_address?.trim()) {
        return res.status(400).json({ error: "Delivery address is required." });
      }
      if (fulfillment === "pickup" && body.payment_method === "cash_on_delivery") {
        return res.status(400).json({ error: "Pickup orders must be paid online." });
      }
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty." });
      }
      const bodyExt = body;
      const result = await createServerOrder({
        items: (body.items ?? []).map((it) => ({
          product_id: String(it.product_id ?? ""),
          quantity: Number(it.quantity ?? 0)
        })),
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        delivery_address: body.delivery_address ?? "",
        delivery_notes: body.delivery_notes ?? null,
        zone_id: body.zone_id ?? null,
        payment_method: method,
        fulfillment_method: fulfillment,
        pickup_location: body.pickup_location ?? null,
        pickup_location_id: bodyExt.pickup_location_id ?? null,
        user_id: authedUserId,
        coupon_code: body.coupon_code ?? null
      });
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      console.error("[POST /api/orders/create]", err);
      return res.status(400).json({ error: message });
    }
  });
  app2.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { orderId, origin } = req.body;
      if (!orderId || !origin) {
        return res.status(400).json({ error: "Missing required fields: orderId, origin" });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({ error: "PayPal is not configured on this server." });
      }
      const order = await getOrderById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found." });
      if (order.payment_method !== "online_card") return res.status(400).json({ error: "Order is not an online payment." });
      if (order.payment_status === "paid") return res.status(409).json({ error: "Order is already paid." });
      if (order.payment_status === "cancelled") return res.status(409).json({ error: "Order is cancelled." });
      if (order.paypal_order_id) {
        return res.status(409).json({ error: "A PayPal payment session is already open for this order." });
      }
      const returnUrl = `${origin}/payment-success`;
      const cancelUrl = `${origin}/payment-cancelled`;
      const result = await createPayPalOrder({
        orderId: order.id,
        amount: order.total,
        // ← from DB, not client
        currency: order.currency_code,
        // ← from DB, not client
        description: `HD Xquisite Liquors Order #${order.id.slice(0, 8).toUpperCase()}`,
        returnUrl,
        cancelUrl
      });
      await bindPayPalOrderId(order.id, result.paypalOrderId);
      return res.json({
        paypalOrderId: result.paypalOrderId,
        approvalUrl: result.approvalUrl
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create PayPal order";
      console.error("[POST /api/paypal/create-order]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/paypal/capture-order", async (req, res) => {
    try {
      const { paypalOrderId } = req.body;
      if (!paypalOrderId) {
        return res.status(400).json({ error: "Missing required field: paypalOrderId" });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({ error: "PayPal is not configured." });
      }
      const pendingMembership = await getMembershipByPayPalId(paypalOrderId);
      if (pendingMembership) {
        if (pendingMembership.status === "active") {
          return res.json({ success: true, kind: "membership", tier: pendingMembership.tier, status: "ALREADY_ACTIVE" });
        }
        const result2 = await capturePayPalOrder(paypalOrderId);
        if (!result2.success) return res.status(402).json({ success: false, status: result2.status, error: "Membership payment was not completed." });
        const activated = await activateMembership({
          paypalOrderId,
          reference: result2.captureId,
          capturedAmount: result2.amount,
          capturedCurrency: result2.currency
        });
        return res.json({
          success: true,
          kind: "membership",
          tier: activated.tier,
          status: result2.status,
          captureId: result2.captureId,
          expires_at: activated.expires_at
        });
      }
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) {
        return res.status(404).json({ error: "No matching order found for this PayPal payment." });
      }
      if (order.payment_status === "paid") {
        try {
          await decrementStockForOrder(order.id);
        } catch (e) {
          console.error("[paypal] retry stock deduction failed (non-fatal):", e);
        }
        return res.json({ success: true, orderId: order.id, status: "ALREADY_PAID" });
      }
      if (order.payment_status === "cancelled" || order.payment_status === "failed") {
        return res.status(409).json({ error: `Order is ${order.payment_status} and cannot be captured.` });
      }
      const result = await capturePayPalOrder(paypalOrderId);
      if (!result.success) {
        await updateOrderFailed(order.id);
        return res.status(402).json({ success: false, status: result.status, error: "Payment capture was not completed." });
      }
      if (result.referenceId && result.referenceId !== order.id) {
        console.error(`[paypal] Reference mismatch: expected=${order.id}, got=${result.referenceId}`);
        return res.status(409).json({ error: "Payment reference mismatch." });
      }
      if (!amountsMatch(result.amount, order.total)) {
        console.error(`[paypal] Amount mismatch: expected=${order.total}, got=${result.amount}`);
        return res.status(409).json({ error: "Payment amount mismatch." });
      }
      if (result.currency.toUpperCase() !== order.currency_code.toUpperCase()) {
        console.error(`[paypal] Currency mismatch: expected=${order.currency_code}, got=${result.currency}`);
        return res.status(409).json({ error: "Payment currency mismatch." });
      }
      await updateOrderPaid(order.id, result.captureId, "paypal");
      try {
        await decrementStockForOrder(order.id);
      } catch (e) {
        console.error("[paypal] post-capture stock deduction failed (non-fatal):", e);
      }
      return res.json({ success: true, orderId: order.id, captureId: result.captureId, status: result.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to capture PayPal order";
      console.error("[POST /api/paypal/capture-order]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/paypal/cancel-order", async (req, res) => {
    try {
      const { paypalOrderId } = req.body;
      if (!paypalOrderId) return res.status(400).json({ error: "Missing paypalOrderId" });
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) return res.status(404).json({ error: "No matching order." });
      if (order.payment_status === "paid") {
        return res.status(409).json({ error: "Order is already paid and cannot be cancelled here." });
      }
      await updateOrderCancelled(order.id);
      return res.json({ success: true, orderId: order.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      console.error("[POST /api/paypal/cancel-order]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/paypal/fail-order", async (req, res) => {
    try {
      const { paypalOrderId } = req.body;
      if (!paypalOrderId) return res.status(400).json({ error: "Missing paypalOrderId" });
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) return res.status(404).json({ error: "No matching order." });
      if (order.payment_status === "paid") {
        return res.status(409).json({ error: "Order is already paid." });
      }
      await updateOrderFailed(order.id);
      return res.json({ success: true, orderId: order.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update order";
      console.error("[POST /api/paypal/fail-order]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.get("/api/orders/by-phone", async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
      if (!checkRateLimit(`orders-by-phone:${ip}`, 10, 6e4)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }
      const phone = (req.query.phone ?? "").trim();
      if (!phone) {
        return res.status(400).json({ error: "phone query parameter is required." });
      }
      if (phone.length < 5 || phone.length > 30) {
        return res.status(400).json({ error: "Invalid phone number format." });
      }
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("orders").select("id,status,created_at,total,currency_symbol,payment_status").eq("customer_phone", phone).order("created_at", { ascending: false }).limit(50);
      if (error) {
        console.error("[GET /api/orders/by-phone]", error);
        return res.status(500).json({ error: "Failed to load orders." });
      }
      return res.json({ orders: data ?? [] });
    } catch (err) {
      console.error("[GET /api/orders/by-phone]", err);
      return res.status(500).json({ error: "Failed to load orders." });
    }
  });
  app2.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: "Invalid order ID." });
      }
      const phone = (req.query.phone ?? "").trim();
      if (!phone) {
        return res.status(400).json({ error: "phone query parameter is required." });
      }
      const ip = (req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
      if (!checkRateLimit(`orders-id:${ip}`, 20, 6e4)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }
      const supabase = getSupabaseAdmin();
      const baseCols = "id,status,customer_name,customer_phone,delivery_address,delivery_notes,subtotal,delivery_fee,total,currency_symbol,currency_code,refusal_reason,created_at,payment_method,payment_status,paid_at";
      const extendedCols = baseCols + ",fulfillment_method,pickup_location";
      const { fulfillmentColumnsExist: fulfillmentColumnsExist2 } = await Promise.resolve().then(() => (init_payment(), payment_exports));
      const cols = await fulfillmentColumnsExist2() ? extendedCols : baseCols;
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select(cols).eq("id", id).maybeSingle(),
        supabase.from("order_items").select("id,order_id,product_id,name,qty,unit_price").eq("order_id", id)
      ]);
      if (orderRes.error) {
        console.error("[GET /api/orders/:id] order error:", orderRes.error);
        return res.status(500).json({ error: "Failed to load order." });
      }
      if (!orderRes.data) {
        return res.status(404).json({ error: "Order not found." });
      }
      const order = orderRes.data;
      if (order.customer_phone.trim() !== phone) {
        return res.status(403).json({ error: "Access denied." });
      }
      return res.json({ order: orderRes.data, items: itemsRes.data ?? [] });
    } catch (err) {
      console.error("[GET /api/orders/:id]", err);
      return res.status(500).json({ error: "Failed to load order." });
    }
  });
  async function ensureAdmin(req, res) {
    const adminId = await requireAdmin(req);
    if (!adminId) {
      res.status(403).json({ error: "Admin access required." });
      return null;
    }
    return adminId;
  }
  async function ensureAdminContext(req, res) {
    const ctx = await getAdminContext(req);
    if (!ctx) {
      res.status(403).json({ error: "Admin access required." });
      return null;
    }
    return ctx;
  }
  async function scopedLocationId(ctx) {
    if (ctx.role === "admin") return { locationId: null };
    const loc = await getLocationBySlug(ctx.locationSlug ?? "");
    if (!loc) return { locationId: null, error: "Your assigned pickup location could not be resolved. Apply supabase-inventory-migration.sql or check the user's app_metadata.location slug." };
    return { locationId: loc.id };
  }
  app2.get("/api/admin/me", async (req, res) => {
    const ctx = await getAdminContext(req);
    if (!ctx) return res.json({ isAdmin: false });
    return res.json({
      isAdmin: true,
      role: ctx.role,
      // 'admin' | 'location_admin'
      location_slug: ctx.locationSlug
      // null for super admin
    });
  });
  app2.get("/api/locations", async (_req, res) => {
    try {
      const locs = await listLocations(true);
      return res.json({
        locations: locs.map((l) => ({ id: l.id, slug: l.slug, name: l.name, address: l.address }))
      });
    } catch (err) {
      console.error("[GET /api/locations]", err);
      return res.status(500).json({ error: "Failed to load locations." });
    }
  });
  app2.get("/api/locations/:slug/availability", async (req, res) => {
    try {
      const slug = String(req.params.slug ?? "");
      if (!/^[a-z0-9_]+$/.test(slug)) return res.status(400).json({ error: "Invalid slug." });
      const map = await locationAvailability(slug);
      return res.json({ availability: map });
    } catch (err) {
      console.error("[GET /api/locations/:slug/availability]", err);
      return res.status(500).json({ error: "Failed to load availability." });
    }
  });
  app2.get("/api/admin/orders", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      const scope = await scopedLocationId(ctx);
      if (scope.error) return res.status(503).json({ error: scope.error });
      const queryLocId = req.query.location_id ?? null;
      const effectiveLocId = ctx.role === "admin" ? queryLocId && /^[0-9a-f-]{36}$/i.test(queryLocId) ? queryLocId : null : scope.locationId;
      const result = await listOrders({
        status: req.query.status ?? null,
        fulfillment: req.query.fulfillment ?? null,
        payment: req.query.payment ?? null,
        q: req.query.q ?? null,
        date: req.query.date ?? null,
        limit: req.query.limit ? Number(req.query.limit) : void 0,
        offset: req.query.offset ? Number(req.query.offset) : void 0,
        locationId: effectiveLocId
      });
      return res.json(result);
    } catch (err) {
      console.error("[GET /api/admin/orders]", err);
      return res.status(500).json({ error: "Failed to load orders." });
    }
  });
  async function ensureOrderInScope(ctx, orderId, res) {
    if (ctx.role === "admin") return true;
    const scope = await scopedLocationId(ctx);
    if (scope.error) {
      res.status(503).json({ error: scope.error });
      return false;
    }
    if (!scope.locationId) {
      res.status(403).json({ error: "Out of scope." });
      return false;
    }
    const orderLoc = await getOrderLocationId(orderId);
    if (orderLoc === void 0) {
      res.status(404).json({ error: "Order not found." });
      return false;
    }
    if (orderLoc !== scope.locationId) {
      res.status(403).json({ error: "Out of scope." });
      return false;
    }
    return true;
  }
  app2.get("/api/admin/orders/:id", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      if (!await ensureOrderInScope(ctx, req.params.id, res)) return;
      const detail = await getOrderDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: "Order not found." });
      return res.json(detail);
    } catch (err) {
      console.error("[GET /api/admin/orders/:id]", err);
      return res.status(500).json({ error: "Failed to load order." });
    }
  });
  app2.patch("/api/admin/orders/:id", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    if (!await ensureOrderInScope(ctx, req.params.id, res)) return;
    try {
      const id = req.params.id;
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Invalid order id." });
      const body = req.body ?? {};
      let order = null;
      let didUpdate = false;
      if (body.status !== void 0) {
        if (!ADMIN_ORDER_STATUSES.includes(body.status)) {
          return res.status(400).json({ error: "Invalid status." });
        }
        order = await updateOrderStatus(id, body.status);
        didUpdate = true;
      }
      if (body.payment_status !== void 0) {
        const allowed = ["pending", "paid", "failed", "cancelled", "refunded"];
        if (!allowed.includes(body.payment_status)) {
          return res.status(400).json({ error: "Invalid payment_status." });
        }
        order = await updatePaymentStatus(id, body.payment_status);
        didUpdate = true;
      }
      if (!didUpdate) return res.status(400).json({ error: "Nothing to update." });
      if (order === null) return res.status(404).json({ error: "Order not found." });
      return res.json({ ok: true, order });
    } catch (err) {
      console.error("[PATCH /api/admin/orders/:id]", err);
      return res.status(500).json({ error: "Failed to update order." });
    }
  });
  app2.get("/api/admin/stats/today", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      const scope = await scopedLocationId(ctx);
      if (scope.error) return res.status(503).json({ error: scope.error });
      return res.json(await todayStats({ locationId: scope.locationId }));
    } catch (err) {
      console.error("[GET /api/admin/stats/today]", err);
      return res.status(500).json({ error: "Failed to load stats." });
    }
  });
  app2.get("/api/admin/locations", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      if (!await inventoryTablesExist()) {
        return res.json({ locations: [], inventory_enabled: false });
      }
      const all = await listLocations(false);
      const filtered = ctx.role === "admin" ? all : all.filter((l) => l.slug === ctx.locationSlug);
      return res.json({ locations: filtered, inventory_enabled: true });
    } catch (err) {
      console.error("[GET /api/admin/locations]", err);
      return res.status(500).json({ error: "Failed to load locations." });
    }
  });
  app2.get("/api/admin/inventory/categories", async (req, res) => {
    if (!await ensureAdminContext(req, res)) return;
    try {
      return res.json({ categories: await listCategories() });
    } catch (err) {
      console.error("[GET /api/admin/inventory/categories]", err);
      return res.status(500).json({ error: "Failed to load categories." });
    }
  });
  app2.get("/api/admin/inventory", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      if (!await inventoryTablesExist()) {
        return res.json({ inventory: [], inventory_enabled: false, message: "Apply supabase-inventory-migration.sql to enable inventory." });
      }
      const requested = req.query.location_slug ?? null;
      const effectiveSlug = ctx.role === "admin" ? requested : ctx.locationSlug;
      const inventory = await listInventory({
        locationSlug: effectiveSlug,
        q: req.query.q ?? null,
        category: req.query.category ?? null,
        lowStockOnly: req.query.low_stock === "1" || req.query.low_stock === "true"
      });
      return res.json({ inventory, inventory_enabled: true });
    } catch (err) {
      console.error("[GET /api/admin/inventory]", err);
      return res.status(500).json({ error: "Failed to load inventory." });
    }
  });
  app2.patch("/api/admin/inventory", async (req, res) => {
    const ctx = await ensureAdminContext(req, res);
    if (!ctx) return;
    try {
      if (!await inventoryTablesExist()) {
        return res.status(503).json({ error: "Inventory not enabled. Apply supabase-inventory-migration.sql." });
      }
      const body = req.body;
      const productId = String(body.product_id ?? "").trim();
      const locationId = String(body.location_id ?? "").trim();
      if (!productId || !locationId) {
        return res.status(400).json({ error: "product_id and location_id are required." });
      }
      if (ctx.role === "location_admin") {
        const scope = await scopedLocationId(ctx);
        if (scope.error) return res.status(503).json({ error: scope.error });
        if (scope.locationId !== locationId) {
          return res.status(403).json({ error: "Out of scope: you can only manage your assigned location." });
        }
      }
      const row = await upsertStock({
        productId,
        locationId,
        quantity: typeof body.quantity === "number" ? body.quantity : void 0,
        lowStockThreshold: typeof body.low_stock_threshold === "number" ? body.low_stock_threshold : void 0
      });
      return res.json({ ok: true, row });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update inventory.";
      console.error("[PATCH /api/admin/inventory]", err);
      return res.status(400).json({ error: message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function serveViteApp(app2) {
  const distPath = path.resolve(process.cwd(), "web", "dist");
  if (!fs.existsSync(distPath)) {
    log(`[web] Warning: ${distPath} not found. Run the build first.`);
    return;
  }
  log(`[web] Serving Vite app from ${distPath}`);
  app2.use(
    express.static(distPath, {
      maxAge: "1y",
      etag: true,
      index: false
    })
  );
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) return next();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(indexPath);
  });
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  const server = await registerRoutes(app);
  if (process.env.NODE_ENV === "production") {
    serveViteApp(app);
  }
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`Express server running on port ${port}`);
    }
  );
})();
