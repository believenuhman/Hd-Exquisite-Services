import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  isPayPalConfigured,
  createPayPalOrder,
  capturePayPalOrder,
  updateOrderPaid,
  updateOrderCancelled,
  updateOrderFailed,
  createServerOrder,
  getOrderById,
  getOrderByPayPalId,
  bindPayPalOrderId,
  getSupabaseAdmin,
} from "./payment";
import { resolveCoupon, CouponError, couponsTableExists } from "./coupons";
import {
  getEffectiveTier,
  getMembershipByUser,
  getMembershipByPayPalId,
  upsertPendingMembership,
  activateMembership,
  membershipTableExists,
} from "./memberships";
import { TIERS, isMembershipTier, type MembershipTier } from "./business";
import { getAuthedUserId } from "./auth";

// Compare two monetary amounts at cent precision.
function amountsMatch(a: number, b: number): boolean {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}

// Simple in-memory rate limiter: max `limit` requests per `windowMs` per key.
// This prevents brute-force enumeration of phone numbers on the order-lookup endpoint.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      paypal: isPayPalConfigured() ? "configured" : "not configured",
    });
  });

  // ── GET /api/paypal/config ──────────────────────────────────────────────
  app.get("/api/paypal/config", (_req: Request, res: Response) => {
    res.json({
      configured: isPayPalConfigured(),
      environment: (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase(),
    });
  });

  // ── GET /api/memberships/me ───────────────────────────────────────────────
  // Returns the effective tier + raw membership row for the AUTHENTICATED user.
  // Identity is derived from the Supabase JWT in `Authorization: Bearer …` —
  // we never trust a user id supplied by the client.
  app.get("/api/memberships/me", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthedUserId(req);
      if (!userId) return res.json({ tier: "standard", membership: null });
      const [tier, membership] = await Promise.all([
        getEffectiveTier(userId),
        getMembershipByUser(userId),
      ]);
      return res.json({ tier, membership });
    } catch (err: unknown) {
      console.error("[GET /api/memberships/me]", err);
      return res.json({ tier: "standard", membership: null });
    }
  });

  // ── POST /api/memberships/subscribe ───────────────────────────────────────
  // Creates a pending membership and a PayPal order to charge the monthly fee.
  // On capture (handled in /api/paypal/capture-order), the membership activates.
  app.post("/api/memberships/subscribe", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthedUserId(req);
      if (!userId) return res.status(401).json({ error: "Sign in required to subscribe." });
      const { tier, origin } = req.body as { tier?: string; origin?: string };
      if (!tier || !origin) return res.status(400).json({ error: "Missing tier or origin." });
      if (!isMembershipTier(tier) || tier === "standard") return res.status(400).json({ error: "Invalid tier." });
      if (!isPayPalConfigured()) return res.status(503).json({ error: "PayPal is not configured." });
      if (!(await membershipTableExists())) return res.status(503).json({ error: "Membership system not enabled. Apply supabase-membership-coupon-migration.sql first." });

      const cfg = TIERS[tier as MembershipTier];

      // Currency from settings table.
      const supabase = getSupabaseAdmin();
      const { data: s } = await supabase.from("settings").select("currency_code").limit(1).maybeSingle();
      const currency = (s as { currency_code?: string } | null)?.currency_code ?? "USD";

      // Synthetic order id for PayPal reference. Stored in user_memberships.pending_paypal_order_id later.
      const ref = `mem-${userId.slice(0, 8)}-${Date.now()}`;
      const result = await createPayPalOrder({
        orderId:     ref,
        amount:      cfg.monthlyPrice,
        currency,
        description: `HD Xquisite ${cfg.label} Membership — 30 days`,
        returnUrl:   `${origin}/payment-success`,
        cancelUrl:   `${origin}/payment-cancelled`,
      });
      await upsertPendingMembership({
        userId,
        tier:          tier as MembershipTier,
        paypalOrderId: result.paypalOrderId,
        amount:        cfg.monthlyPrice,
        currencyCode:  currency,
      });
      return res.json({ paypalOrderId: result.paypalOrderId, approvalUrl: result.approvalUrl, kind: "membership" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start membership.";
      console.error("[POST /api/memberships/subscribe]", err);
      return res.status(500).json({ error: message });
    }
  });

  // ── POST /api/coupons/validate ────────────────────────────────────────────
  // Lets the checkout page show an authoritative discount preview before placing
  // the order. Final discount is recomputed at order creation — never trust the
  // client to carry a discount value across requests.
  app.post("/api/coupons/validate", async (req: Request, res: Response) => {
    try {
      const { code, subtotal, delivery_fee, customer_phone } = req.body as {
        code?: string;
        subtotal?: number;
        delivery_fee?: number;
        customer_phone?: string;
      };
      if (!code || typeof subtotal !== "number") {
        return res.status(400).json({ error: "Missing code or subtotal." });
      }
      if (!(await couponsTableExists())) {
        return res.status(503).json({ error: "Coupon system not enabled. Apply supabase-membership-coupon-migration.sql first." });
      }

      // Identity from JWT only — never the request body.
      const authedUserId = await getAuthedUserId(req);
      // Determine member tier so member discount is reflected in preview.
      const tier   = await getEffectiveTier(authedUserId);
      const cfg    = (await import("./business.js")).tierConfig(tier);
      const memberDiscount = Math.round((subtotal * cfg.memberDiscountPct / 100) * 100) / 100;

      const result = await resolveCoupon({
        code,
        subtotal:      Math.max(0, subtotal - memberDiscount),
        deliveryFee:   Number(delivery_fee ?? 0),
        customerTier:  tier,
        userId:        authedUserId,
        customerPhone: String(customer_phone ?? ""),
      });

      return res.json({
        ok:                true,
        code:              result.coupon.code,
        description:       result.coupon.description,
        discount_type:     result.coupon.discount_type,
        discount_value:    result.coupon.discount_value,
        coupon_discount:   result.freeDelivery ? 0 : result.discountAmount,
        free_delivery:     result.freeDelivery,
        membership_tier:   tier,
        membership_discount: memberDiscount,
      });
    } catch (err: unknown) {
      if (err instanceof CouponError) return res.status(err.status).json({ error: err.message });
      console.error("[POST /api/coupons/validate]", err);
      return res.status(500).json({ error: "Failed to validate coupon." });
    }
  });

  // ── POST /api/orders/create ───────────────────────────────────────────────
  // Authoritative order creation. Frontend sends ONLY product IDs + quantities.
  // Server reads prices from the database. Client-supplied totals are ignored.
  app.post("/api/orders/create", async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        items?: { product_id?: string; quantity?: number }[];
        customer_name?: string;
        customer_phone?: string;
        delivery_address?: string;
        delivery_notes?: string | null;
        zone_id?: string | null;
        payment_method?: string;
        fulfillment_method?: string;
        pickup_location?: string | null;
        coupon_code?: string | null;
      };

      // Identity is derived from the verified Supabase JWT — clients can no
      // longer spoof a `user_id` to impersonate another customer's tier or
      // claim per-user coupon redemptions on their behalf. Guests stay null.
      const authedUserId = await getAuthedUserId(req);

      const fulfillment = body.fulfillment_method === "pickup" ? "pickup" : "delivery";
      // Pickup orders MUST be paid online (PayPal). Cash on Delivery is delivery-only.
      const method = fulfillment === "pickup"
        ? "online_card"
        : (body.payment_method === "online_card" ? "online_card" : "cash_on_delivery");

      if (!body.customer_name?.trim())  return res.status(400).json({ error: "Name is required." });
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

      const result = await createServerOrder({
        items: (body.items ?? []).map((it) => ({
          product_id: String(it.product_id ?? ""),
          quantity:   Number(it.quantity ?? 0),
        })),
        customer_name:      body.customer_name,
        customer_phone:     body.customer_phone,
        delivery_address:   body.delivery_address ?? "",
        delivery_notes:     body.delivery_notes ?? null,
        zone_id:            body.zone_id ?? null,
        payment_method:     method,
        fulfillment_method: fulfillment,
        pickup_location:    body.pickup_location ?? null,
        user_id:            authedUserId,
        coupon_code:        body.coupon_code ?? null,
      });

      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      console.error("[POST /api/orders/create]", err);
      return res.status(400).json({ error: message });
    }
  });

  // ── POST /api/paypal/create-order ─────────────────────────────────────────
  // Creates a PayPal order. Frontend sends ONLY orderId + origin.
  // Amount is loaded from the database — never trusted from the client.
  app.post("/api/paypal/create-order", async (req: Request, res: Response) => {
    try {
      const { orderId, origin } = req.body as { orderId?: string; origin?: string };

      if (!orderId || !origin) {
        return res.status(400).json({ error: "Missing required fields: orderId, origin" });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({ error: "PayPal is not configured on this server." });
      }

      const order = await getOrderById(orderId);
      if (!order)                                  return res.status(404).json({ error: "Order not found." });
      if (order.payment_method !== "online_card")  return res.status(400).json({ error: "Order is not an online payment." });
      if (order.payment_status === "paid")         return res.status(409).json({ error: "Order is already paid." });
      if (order.payment_status === "cancelled")    return res.status(409).json({ error: "Order is cancelled." });
      // Reject if a PayPal session is already bound — prevents a malicious or
      // duplicate call from replacing the existing binding and creating a second
      // PayPal order for the same local record.
      if (order.paypal_order_id) {
        return res.status(409).json({ error: "A PayPal payment session is already open for this order." });
      }

      const returnUrl = `${origin}/payment-success`;
      const cancelUrl = `${origin}/payment-cancelled`;

      const result = await createPayPalOrder({
        orderId:     order.id,
        amount:      order.total,         // ← from DB, not client
        currency:    order.currency_code, // ← from DB, not client
        description: `HD Xquisite Liquors Order #${order.id.slice(0, 8).toUpperCase()}`,
        returnUrl,
        cancelUrl,
      });

      // Bind PayPal order ID to local order so it can't be replayed elsewhere
      await bindPayPalOrderId(order.id, result.paypalOrderId);

      return res.json({
        paypalOrderId: result.paypalOrderId,
        approvalUrl:   result.approvalUrl,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create PayPal order";
      console.error("[POST /api/paypal/create-order]", err);
      return res.status(500).json({ error: message });
    }
  });

  // ── POST /api/paypal/capture-order ────────────────────────────────────────
  // Captures the PayPal order. Frontend sends ONLY the PayPal token.
  // Server looks up the bound local order, captures, then verifies amount/currency.
  app.post("/api/paypal/capture-order", async (req: Request, res: Response) => {
    try {
      const { paypalOrderId } = req.body as { paypalOrderId?: string };

      if (!paypalOrderId) {
        return res.status(400).json({ error: "Missing required field: paypalOrderId" });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({ error: "PayPal is not configured." });
      }

      // First, check if this PayPal token is bound to a MEMBERSHIP rather than a product order.
      const pendingMembership = await getMembershipByPayPalId(paypalOrderId);
      if (pendingMembership) {
        if (pendingMembership.status === "active") {
          return res.json({ success: true, kind: "membership", tier: pendingMembership.tier, status: "ALREADY_ACTIVE" });
        }
        const result = await capturePayPalOrder(paypalOrderId);
        if (!result.success) return res.status(402).json({ success: false, status: result.status, error: "Membership payment was not completed." });
        const activated = await activateMembership({
          paypalOrderId,
          reference:        result.captureId,
          capturedAmount:   result.amount,
          capturedCurrency: result.currency,
        });
        return res.json({
          success: true,
          kind:    "membership",
          tier:    activated.tier,
          status:  result.status,
          captureId: result.captureId,
          expires_at: activated.expires_at,
        });
      }

      // Otherwise, treat as a product order.
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) {
        return res.status(404).json({ error: "No matching order found for this PayPal payment." });
      }

      // Idempotency: if already paid, return success without re-capturing
      if (order.payment_status === "paid") {
        return res.json({ success: true, orderId: order.id, status: "ALREADY_PAID" });
      }
      if (order.payment_status === "cancelled" || order.payment_status === "failed") {
        return res.status(409).json({ error: `Order is ${order.payment_status} and cannot be captured.` });
      }

      const result = await capturePayPalOrder(paypalOrderId);

      // Verify the capture matches what we expect from the database
      if (!result.success) {
        await updateOrderFailed(order.id);
        return res.status(402).json({ success: false, status: result.status, error: "Payment capture was not completed." });
      }

      // 1. Reference ID must match local order ID
      if (result.referenceId && result.referenceId !== order.id) {
        console.error(`[paypal] Reference mismatch: expected=${order.id}, got=${result.referenceId}`);
        return res.status(409).json({ error: "Payment reference mismatch." });
      }

      // 2. Amount must match DB total
      if (!amountsMatch(result.amount, order.total)) {
        console.error(`[paypal] Amount mismatch: expected=${order.total}, got=${result.amount}`);
        return res.status(409).json({ error: "Payment amount mismatch." });
      }

      // 3. Currency must match DB
      if (result.currency.toUpperCase() !== order.currency_code.toUpperCase()) {
        console.error(`[paypal] Currency mismatch: expected=${order.currency_code}, got=${result.currency}`);
        return res.status(409).json({ error: "Payment currency mismatch." });
      }

      // All checks passed — mark order paid
      await updateOrderPaid(order.id, result.captureId, "paypal");
      return res.json({ success: true, orderId: order.id, captureId: result.captureId, status: result.status });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to capture PayPal order";
      console.error("[POST /api/paypal/capture-order]", err);
      return res.status(500).json({ error: message });
    }
  });

  // ── POST /api/paypal/cancel-order ─────────────────────────────────────────
  // Frontend sends ONLY the PayPal token. We look up the bound order.
  // Anonymous attackers can't mark arbitrary orders cancelled because they don't
  // hold the PayPal token PayPal returned to the actual buyer.
  app.post("/api/paypal/cancel-order", async (req: Request, res: Response) => {
    try {
      const { paypalOrderId } = req.body as { paypalOrderId?: string };
      if (!paypalOrderId) return res.status(400).json({ error: "Missing paypalOrderId" });
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) return res.status(404).json({ error: "No matching order." });
      if (order.payment_status === "paid") {
        return res.status(409).json({ error: "Order is already paid and cannot be cancelled here." });
      }
      await updateOrderCancelled(order.id);
      return res.json({ success: true, orderId: order.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      console.error("[POST /api/paypal/cancel-order]", err);
      return res.status(500).json({ error: message });
    }
  });

  // ── POST /api/paypal/fail-order ─────────────────────────────────────────
  app.post("/api/paypal/fail-order", async (req: Request, res: Response) => {
    try {
      const { paypalOrderId } = req.body as { paypalOrderId?: string };
      if (!paypalOrderId) return res.status(400).json({ error: "Missing paypalOrderId" });
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) return res.status(404).json({ error: "No matching order." });
      if (order.payment_status === "paid") {
        return res.status(409).json({ error: "Order is already paid." });
      }
      await updateOrderFailed(order.id);
      return res.json({ success: true, orderId: order.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update order";
      console.error("[POST /api/paypal/fail-order]", err);
      return res.status(500).json({ error: message });
    }
  });

  // ── GET /api/orders/by-phone ──────────────────────────────────────────────
  // Returns order summaries for a given phone number.
  // Rate-limited per IP (10 req/min) to prevent phone enumeration.
  // Only non-PII summary fields are returned; full order details require
  // a separate authenticated lookup via GET /api/orders/:id?phone=<phone>.
  app.get("/api/orders/by-phone", async (req: Request, res: Response) => {
    try {
      // Rate limit by IP to mitigate phone-number brute-force enumeration.
      const ip = (req.headers["x-forwarded-for"] as string | undefined ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
      if (!checkRateLimit(`orders-by-phone:${ip}`, 10, 60_000)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }

      const phone = (req.query.phone as string ?? "").trim();
      if (!phone) {
        return res.status(400).json({ error: "phone query parameter is required." });
      }
      // Reject obviously invalid phone strings to reduce noise.
      if (phone.length < 5 || phone.length > 30) {
        return res.status(400).json({ error: "Invalid phone number format." });
      }

      const supabase = getSupabaseAdmin();
      // Return only the minimum fields needed for the order list view.
      // delivery_address and other PII are deliberately excluded — they are
      // only returned from GET /api/orders/:id which requires the phone match.
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,created_at,total,currency_symbol,payment_status")
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("[GET /api/orders/by-phone]", error);
        return res.status(500).json({ error: "Failed to load orders." });
      }
      return res.json({ orders: data ?? [] });
    } catch (err: unknown) {
      console.error("[GET /api/orders/by-phone]", err);
      return res.status(500).json({ error: "Failed to load orders." });
    }
  });

  // ── GET /api/orders/:id ────────────────────────────────────────────────────
  // Returns a single order and its items.
  // Requires `phone` query param that must match the order's customer_phone.
  // This dual-factor check (UUID + phone) ensures only the order creator can
  // access their own order detail, without requiring a user account.
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: "Invalid order ID." });
      }

      // Phone is required as a proof-of-ownership alongside the order UUID.
      const phone = (req.query.phone as string ?? "").trim();
      if (!phone) {
        return res.status(400).json({ error: "phone query parameter is required." });
      }

      // Rate limit per IP to mitigate guessing attacks.
      const ip = (req.headers["x-forwarded-for"] as string | undefined ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
      if (!checkRateLimit(`orders-id:${ip}`, 20, 60_000)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }

      const supabase = getSupabaseAdmin();

      // Fetch only the fields the UI needs; verify phone ownership in one query.
      const baseCols     = "id,status,customer_name,customer_phone,delivery_address,delivery_notes,subtotal,delivery_fee,total,currency_symbol,currency_code,refusal_reason,created_at,payment_method,payment_status,paid_at";
      const extendedCols = baseCols + ",fulfillment_method,pickup_location";
      const { fulfillmentColumnsExist } = await import("./payment.js");
      const cols = (await fulfillmentColumnsExist()) ? extendedCols : baseCols;
      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from("orders")
          .select(cols)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("id,order_id,product_id,name,qty,unit_price")
          .eq("order_id", id),
      ]);

      if (orderRes.error) {
        console.error("[GET /api/orders/:id] order error:", orderRes.error);
        return res.status(500).json({ error: "Failed to load order." });
      }
      if (!orderRes.data) {
        return res.status(404).json({ error: "Order not found." });
      }

      // Verify caller knows the customer phone linked to this order.
      const order = orderRes.data as { customer_phone: string };
      if (order.customer_phone.trim() !== phone) {
        return res.status(403).json({ error: "Access denied." });
      }

      return res.json({ order: orderRes.data, items: itemsRes.data ?? [] });
    } catch (err: unknown) {
      console.error("[GET /api/orders/:id]", err);
      return res.status(500).json({ error: "Failed to load order." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
