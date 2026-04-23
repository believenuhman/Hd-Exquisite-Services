import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getSupabaseAdmin() {
  if (!SUPABASE_URL)
    throw new Error("Supabase URL not configured. Set SUPABASE_URL (or VITE_SUPABASE_URL).");
  if (!SUPABASE_SERVICE_KEY)
    throw new Error("Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in Replit Secrets.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── PayPal configuration ─────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID     = (process.env.PAYPAL_CLIENT_ID     ?? "").trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
const PAYPAL_ENV           = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase().trim();

export function getPayPalBase(): string {
  return PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  return Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

// ─── PayPal OAuth ─────────────────────────────────────────────────────────────

export async function getPayPalAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal token request failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── PayPal Orders API ────────────────────────────────────────────────────────

export type CreatePayPalOrderRequest = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
};

export type CreatePayPalOrderResult = {
  paypalOrderId: string;
  approvalUrl: string;
};

export async function createPayPalOrder(req: CreatePayPalOrderRequest): Promise<CreatePayPalOrderResult> {
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
          value,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: req.returnUrl,
          cancel_url: req.cancelUrl,
        },
      },
    },
  };

  const res = await fetch(`${getPayPalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `hd-${req.orderId}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    id: string;
    links: { rel: string; href: string }[];
  };

  const approvalUrl = data.links.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? "";

  if (!approvalUrl) {
    throw new Error("PayPal did not return an approval URL");
  }

  console.log(`[paypal] Order created: ${data.id} → ${approvalUrl}`);
  return { paypalOrderId: data.id, approvalUrl };
}

// ─── PayPal Capture ───────────────────────────────────────────────────────────

export type CapturePayPalOrderResult = {
  success: boolean;
  captureId: string;
  status: string;
  amount: number;       // amount actually captured by PayPal
  currency: string;     // currency actually captured by PayPal
  referenceId: string;  // purchase_units[0].reference_id (our local order id)
};

export async function capturePayPalOrder(paypalOrderId: string): Promise<CapturePayPalOrderResult> {
  const accessToken = await getPayPalAccessToken();

  const res = await fetch(`${getPayPalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    status: string;
    purchase_units: {
      reference_id?: string;
      payments: {
        captures: {
          id: string;
          status: string;
          amount: { currency_code: string; value: string };
        }[];
      };
    }[];
  };

  const unit       = data.purchase_units?.[0];
  const capture    = unit?.payments?.captures?.[0];
  const captureId  = capture?.id ?? paypalOrderId;
  const success    = data.status === "COMPLETED" || capture?.status === "COMPLETED";
  const amount     = Number(capture?.amount?.value ?? 0);
  const currency   = (capture?.amount?.currency_code ?? "").toUpperCase();
  const referenceId = unit?.reference_id ?? "";

  console.log(`[paypal] Captured ${paypalOrderId}: status=${data.status}, captureId=${captureId}, amount=${amount} ${currency}, ref=${referenceId}`);

  return { success, captureId, status: data.status, amount, currency, referenceId };
}

// ─── Order status helpers ─────────────────────────────────────────────────────

export async function updateOrderPaid(orderId: string, reference: string, gateway: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders").update({
    payment_status:    "paid",
    payment_reference: reference,
    gateway_name:      gateway,
    paid_at:           new Date().toISOString(),
  }).eq("id", orderId);
  if (error) {
    console.error("[payment] updateOrderPaid error:", error);
    throw new Error("Failed to mark order paid: " + error.message);
  }
}

export async function updateOrderCancelled(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders")
    .update({ payment_status: "cancelled" })
    .eq("id", orderId)
    .eq("payment_status", "pending"); // never overwrite a paid order
  if (error) {
    console.error("[payment] updateOrderCancelled error:", error);
    throw new Error("Failed to cancel order: " + error.message);
  }
}

export async function updateOrderFailed(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders")
    .update({ payment_status: "failed" })
    .eq("id", orderId)
    .eq("payment_status", "pending"); // never overwrite a paid order
  if (error) {
    console.error("[payment] updateOrderFailed error:", error);
    throw new Error("Failed to fail order: " + error.message);
  }
}

// ─── Order lookup helpers (binding) ───────────────────────────────────────────

export type LocalOrder = {
  id: string;
  total: number;
  currency_code: string;
  payment_status: string;
  payment_method: string;
  paypal_order_id: string | null;
};

export async function getOrderByPayPalId(paypalOrderId: string): Promise<LocalOrder | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("id,total,currency_code,payment_status,payment_method,paypal_order_id")
    .eq("paypal_order_id", paypalOrderId)
    .maybeSingle();
  if (error) {
    console.error("[payment] getOrderByPayPalId error:", error);
    return null;
  }
  return (data as LocalOrder) ?? null;
}

export async function getOrderById(orderId: string): Promise<LocalOrder | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("id,total,currency_code,payment_status,payment_method,paypal_order_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("[payment] getOrderById error:", error);
    return null;
  }
  return (data as LocalOrder) ?? null;
}

export async function bindPayPalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Only bind if paypal_order_id is still null — prevents a second PayPal session
  // from overwriting an in-progress binding (race-condition / double-create guard).
  const { data, error } = await supabase
    .from("orders")
    .update({ paypal_order_id: paypalOrderId })
    .eq("id", orderId)
    .is("paypal_order_id", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[payment] bindPayPalOrderId error:", error);
    throw new Error("Failed to bind PayPal order ID: " + error.message);
  }
  if (!data) {
    // Row was not updated — either order not found or already has a PayPal binding.
    // Re-fetch to distinguish the cases and give a meaningful error.
    const existing = await getOrderById(orderId);
    if (!existing) throw new Error("Order not found when attempting to bind PayPal order.");
    if (existing.paypal_order_id && existing.paypal_order_id !== paypalOrderId) {
      // Log for monitoring: multiple distinct PayPal sessions against one order
      // may indicate a replay attempt or race condition — alert if frequent.
      console.warn(
        `[paypal] BIND_CONFLICT orderId=${orderId} ` +
        `existingPaypalId=${existing.paypal_order_id} ` +
        `attemptedPaypalId=${paypalOrderId}`
      );
      throw new Error("Order is already bound to a different PayPal payment session.");
    }
    // Same paypal_order_id — idempotent re-bind; treat as success.
    console.log(`[paypal] bindPayPalOrderId idempotent: orderId=${orderId} paypalOrderId=${paypalOrderId}`);
  }
}

// ─── Server-side order creation (price authority) ─────────────────────────────

export type OrderItemInput = { product_id: string; quantity: number };

export type CreateOrderInput = {
  items:               OrderItemInput[];
  customer_name:       string;
  customer_phone:      string;
  delivery_address:    string;
  delivery_notes:      string | null;
  zone_id:             string | null;
  payment_method:      "cash_on_delivery" | "online_card";
  fulfillment_method?: "delivery" | "pickup";
  pickup_location?:    string | null;
  pickup_location_id?: string | null;   // FK to pickup_locations.id (required for pickup once inventory migration is applied)
  user_id?:            string | null;   // signed-in user id (for membership lookup + redemption attribution)
  coupon_code?:        string | null;   // raw client input; resolved + validated server-side
};

export type CreateOrderResult = {
  orderId:             string;
  subtotal:            number;
  deliveryFee:         number;
  total:               number;
  currencyCode:        string;
  membershipTier:      "standard" | "gold" | "platinum";
  membershipDiscount:  number;
  couponCode:          string | null;
  couponDiscount:      number;
  totalDiscount:       number;
};

// Detect whether the fulfillment_method / pickup_location columns exist.
// Cached so we only probe Supabase once. Lets the app run with or without
// the supabase-fulfillment-migration.sql migration applied.
let fulfillmentColumnsExistCache: boolean | null = null;
export async function fulfillmentColumnsExist(): Promise<boolean> {
  if (fulfillmentColumnsExistCache !== null) return fulfillmentColumnsExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("fulfillment_method").limit(1);
    fulfillmentColumnsExistCache = !error;
    if (error) {
      console.warn("[payment] fulfillment columns NOT present — pickup mode disabled until supabase-fulfillment-migration.sql is run.");
    }
  } catch {
    fulfillmentColumnsExistCache = false;
  }
  return fulfillmentColumnsExistCache;
}

export async function createServerOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const supabase = getSupabaseAdmin();
  const hasFulfillmentCols = await fulfillmentColumnsExist();

  // 1. Validate items
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }
  const cleanItems = input.items
    .map((it) => ({
      product_id: String(it.product_id ?? "").trim(),
      quantity:   Math.max(0, Math.floor(Number(it.quantity ?? 0))),
    }))
    .filter((it) => it.product_id && it.quantity > 0);
  if (cleanItems.length === 0) throw new Error("All items have zero quantity.");

  // 2. Look up authoritative product prices from the database
  const productIds = [...new Set(cleanItems.map((it) => it.product_id))];
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id,name,price,stock_qty")
    .in("id", productIds);
  if (prodErr) throw new Error("Failed to load products: " + prodErr.message);
  if (!products || products.length === 0) throw new Error("No matching products found.");

  const priceById = new Map<string, { name: string; price: number; stock_qty: number }>();
  for (const p of products as { id: string; name: string; price: number; stock_qty: number }[]) {
    priceById.set(p.id, { name: p.name, price: Number(p.price ?? 0), stock_qty: Number(p.stock_qty ?? 0) });
  }
  // Stock check:
  //   - PICKUP orders: per-location stock (product_stock table) — checked below
  //     against the selected pickup_location_id. The global stock_qty is
  //     ignored for pickup so a "0 globally" product can still be sold from a
  //     stocked location.
  //   - DELIVERY orders: keep checking the legacy global stock_qty.
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

  // 3. Calculate subtotal from DB prices ONLY
  let subtotal = 0;
  for (const it of cleanItems) {
    const p = priceById.get(it.product_id)!;
    subtotal += p.price * it.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  // 4. Calculate delivery fee from DB (zero for pickup orders)
  const fulfillmentMethod = input.fulfillment_method === "pickup" ? "pickup" : "delivery";
  if (fulfillmentMethod === "pickup" && !hasFulfillmentCols) {
    throw new Error("Pickup is not available yet. Please run supabase-fulfillment-migration.sql in Supabase SQL Editor to enable it.");
  }
  let deliveryFee = 0;
  if (fulfillmentMethod === "delivery") {
    if (input.zone_id) {
      const { data: zone, error: zoneErr } = await supabase
        .from("delivery_zones")
        .select("fee,is_active")
        .eq("id", input.zone_id)
        .maybeSingle();
      if (zoneErr) throw new Error("Failed to load delivery zone: " + zoneErr.message);
      if (!zone || zone.is_active === false) throw new Error("Selected delivery zone is not available.");
      deliveryFee = Number(zone.fee ?? 0);
    } else {
      const { data: settings } = await supabase
        .from("settings")
        .select("flat_fee")
        .limit(1)
        .maybeSingle();
      deliveryFee = Number((settings as { flat_fee?: number } | null)?.flat_fee ?? 0);
    }
  }
  deliveryFee = Math.round(deliveryFee * 100) / 100;

  // 5. Currency from settings
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("currency_code,currency_symbol")
    .limit(1)
    .maybeSingle();
  const currencyCode   = (settingsRow as { currency_code?: string } | null)?.currency_code ?? "USD";
  const currencySymbol = (settingsRow as { currency_symbol?: string } | null)?.currency_symbol ?? "$";

  // 5a. Membership tier (authoritative, from DB) → member discount %
  const { getEffectiveTier }    = await import("./memberships.js");
  const { resolveCoupon, recordCouponRedemption } = await import("./coupons.js");
  const { tierConfig, isDeliveryAvailableForTier, deliveryCutoffLabelForTier } = await import("./business.js");

  const membershipTier = await getEffectiveTier(input.user_id ?? null);
  const tierCfg        = tierConfig(membershipTier);

  // Cutoff enforcement (server is source of truth)
  if (fulfillmentMethod === "delivery" && !isDeliveryAvailableForTier(membershipTier)) {
    throw new Error(
      `Delivery is closed for today (${tierCfg.label} cutoff is ${deliveryCutoffLabelForTier(membershipTier)}). ` +
      `Please choose Pick Up or order again tomorrow.`,
    );
  }

  // 5b. Member discount (% off subtotal). Applied first.
  const membershipDiscount = Math.round((subtotal * tierCfg.memberDiscountPct / 100) * 100) / 100;

  // 5c. Coupon — resolved server-side. May reduce subtotal further or zero the delivery fee.
  let couponDiscount = 0;
  let couponCode: string | null = null;
  let resolvedCoupon: Awaited<ReturnType<typeof resolveCoupon>> | null = null;

  if (input.coupon_code && input.coupon_code.trim()) {
    resolvedCoupon = await resolveCoupon({
      code:          input.coupon_code,
      subtotal:      Math.max(0, subtotal - membershipDiscount), // coupon applies to discounted subtotal
      deliveryFee,
      customerTier:  membershipTier,
      userId:        input.user_id ?? null,
      customerPhone: String(input.customer_phone ?? "").trim(),
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
  const total         = Math.round((subtotalAfter + deliveryFee) * 100) / 100;

  // 6. Insert order (only include fulfillment columns if the migration was applied)
  const trimmedAddress = String(input.delivery_address ?? "").trim();
  const orderRow: Record<string, unknown> = {
    customer_name:    String(input.customer_name ?? "").trim(),
    customer_phone:   String(input.customer_phone ?? "").trim(),
    delivery_address: fulfillmentMethod === "pickup" ? null : trimmedAddress,
    delivery_notes:   input.delivery_notes ? String(input.delivery_notes).trim() : null,
    age_confirmed:    true,
    status:           "received",
    subtotal,
    delivery_fee:     deliveryFee,
    total,
    currency_code:    currencyCode,
    currency_symbol:  currencySymbol,
    zone_id:          fulfillmentMethod === "pickup" ? null : (input.zone_id ?? null),
    payment_method:   input.payment_method,
    payment_status:   "pending",
    gateway_name:     input.payment_method === "online_card" ? "paypal" : null,
  };
  if (hasFulfillmentCols) {
    orderRow.fulfillment_method = fulfillmentMethod;
    orderRow.pickup_location    = fulfillmentMethod === "pickup" ? (input.pickup_location ?? null) : null;
  }
  // Per-location pickup stock: validate against the selected location, then
  // bind orders.pickup_location_id (FK) so post-payment decrement and
  // location-admin scoping can find the order. If the inventory migration
  // hasn't been applied, gracefully skip — pickup will work but stock won't
  // be deducted until the admin runs supabase-inventory-migration.sql.
  const { inventoryTablesExist, orderPickupLocationColExists, getLocationById, checkPickupStock } = await import("./inventory.js");
  if (fulfillmentMethod === "pickup" && (await inventoryTablesExist())) {
    const locId = (input.pickup_location_id ?? "").trim();
    if (!locId) {
      throw new Error("Please choose a pickup location.");
    }
    const loc = await getLocationById(locId);
    if (!loc || !loc.is_active) {
      throw new Error("Selected pickup location is not available.");
    }
    const stockErr = await checkPickupStock(loc.id, cleanItems);
    if (stockErr) throw new Error(stockErr);
    if (await orderPickupLocationColExists()) {
      orderRow.pickup_location_id = loc.id;
    }
    // Always overwrite pickup_location label with the canonical address from
    // the DB so the admin sees a consistent value even if the client lied.
    if (hasFulfillmentCols) {
      orderRow.pickup_location = loc.address || loc.name;
    }
  }
  // Snapshot membership + coupon onto the order if those columns exist (migration applied).
  const hasMembershipCols = await orderMembershipColumnsExist();
  if (hasMembershipCols) {
    orderRow.user_id              = input.user_id ?? null;
    orderRow.membership_tier      = membershipTier;
    orderRow.membership_discount  = membershipDiscount;
    orderRow.coupon_code          = couponCode;
    orderRow.coupon_discount      = couponDiscount;
    orderRow.total_discount       = totalDiscount;
  }
  const insertRes = await supabase.from("orders").insert(orderRow).select().single();

  if (insertRes.error) throw new Error("Failed to create order: " + insertRes.error.message);
  const order = insertRes.data as { id: string };

  // 7. Insert order_items with DB prices
  const orderItems = cleanItems.map((it) => {
    const p = priceById.get(it.product_id)!;
    return {
      order_id:   order.id,
      product_id: it.product_id,
      name:       p.name,
      qty:        it.quantity,
      unit_price: p.price,
    };
  });
  const itemsRes = await supabase.from("order_items").insert(orderItems);
  if (itemsRes.error) {
    // Roll back the order if items failed
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error("Failed to create order items: " + itemsRes.error.message);
  }

  // 8. Record coupon redemption (best-effort; logged on failure)
  if (resolvedCoupon) {
    try {
      await recordCouponRedemption({
        coupon:         resolvedCoupon.coupon,
        orderId:        order.id,
        userId:         input.user_id ?? null,
        customerPhone:  String(input.customer_phone ?? "").trim(),
        discountAmount: resolvedCoupon.freeDelivery ? 0 : couponDiscount,
      });
    } catch (e) {
      console.error("[order] coupon redemption record failed (non-fatal):", e);
    }
  }

  return {
    orderId:            order.id,
    subtotal,
    deliveryFee,
    total,
    currencyCode,
    membershipTier,
    membershipDiscount,
    couponCode,
    couponDiscount,
    totalDiscount,
  };
}

// Detect whether the membership/coupon snapshot columns on `orders` exist.
let orderMembershipColumnsExistCache: boolean | null = null;
export async function orderMembershipColumnsExist(): Promise<boolean> {
  if (orderMembershipColumnsExistCache !== null) return orderMembershipColumnsExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("membership_tier").limit(1);
    orderMembershipColumnsExistCache = !error;
    if (error) console.warn("[payment] orders.membership_tier missing — apply supabase-membership-coupon-migration.sql to enable per-order membership/coupon snapshots.");
  } catch { orderMembershipColumnsExistCache = false; }
  return orderMembershipColumnsExistCache;
}
