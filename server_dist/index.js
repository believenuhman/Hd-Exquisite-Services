// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/payment.ts
import { createClient } from "@supabase/supabase-js";
var SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
function getSupabaseAdmin() {
  if (!SUPABASE_URL)
    throw new Error("Supabase URL not configured. Set SUPABASE_URL (or VITE_SUPABASE_URL).");
  if (!SUPABASE_SERVICE_KEY)
    throw new Error("Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in Replit Secrets.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
var PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
var PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
var PAYPAL_ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase().trim();
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
  const { error } = await supabase.from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", orderId);
  if (error) {
    console.error("[payment] bindPayPalOrderId error:", error);
    throw new Error("Failed to bind PayPal order ID: " + error.message);
  }
}
async function createServerOrder(input) {
  const supabase = getSupabaseAdmin();
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
  for (const it of cleanItems) {
    if (!priceById.has(it.product_id)) {
      throw new Error(`Product ${it.product_id} is not available.`);
    }
  }
  let subtotal = 0;
  for (const it of cleanItems) {
    const p = priceById.get(it.product_id);
    subtotal += p.price * it.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  let deliveryFee = 0;
  if (input.zone_id) {
    const { data: zone, error: zoneErr } = await supabase.from("delivery_zones").select("fee,is_active").eq("id", input.zone_id).maybeSingle();
    if (zoneErr) throw new Error("Failed to load delivery zone: " + zoneErr.message);
    if (!zone || zone.is_active === false) throw new Error("Selected delivery zone is not available.");
    deliveryFee = Number(zone.fee ?? 0);
  } else {
    const { data: settings } = await supabase.from("app_settings").select("flat_fee").limit(1).maybeSingle();
    deliveryFee = Number(settings?.flat_fee ?? 0);
  }
  deliveryFee = Math.round(deliveryFee * 100) / 100;
  const { data: settingsRow } = await supabase.from("app_settings").select("currency_code,currency_symbol").limit(1).maybeSingle();
  const currencyCode = settingsRow?.currency_code ?? "USD";
  const currencySymbol = settingsRow?.currency_symbol ?? "$";
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const insertRes = await supabase.from("orders").insert({
    customer_name: String(input.customer_name ?? "").trim(),
    customer_phone: String(input.customer_phone ?? "").trim(),
    delivery_address: String(input.delivery_address ?? "").trim(),
    delivery_notes: input.delivery_notes ? String(input.delivery_notes).trim() : null,
    age_confirmed: true,
    status: "received",
    subtotal,
    delivery_fee: deliveryFee,
    total,
    currency_code: currencyCode,
    currency_symbol: currencySymbol,
    zone_id: input.zone_id ?? null,
    payment_method: input.payment_method,
    payment_status: "pending",
    gateway_name: input.payment_method === "online_card" ? "paypal" : null
  }).select().single();
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
  return { orderId: order.id, subtotal, deliveryFee, total, currencyCode };
}

// server/routes.ts
function amountsMatch(a, b) {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
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
  app2.post("/api/orders/create", async (req, res) => {
    try {
      const body = req.body;
      const method = body.payment_method === "online_card" ? "online_card" : "cash_on_delivery";
      if (!body.customer_name?.trim()) return res.status(400).json({ error: "Name is required." });
      if (!body.customer_phone?.trim()) return res.status(400).json({ error: "Phone is required." });
      if (!body.delivery_address?.trim()) return res.status(400).json({ error: "Delivery address is required." });
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty." });
      }
      const result = await createServerOrder({
        items: (body.items ?? []).map((it) => ({
          product_id: String(it.product_id ?? ""),
          quantity: Number(it.quantity ?? 0)
        })),
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        delivery_address: body.delivery_address,
        delivery_notes: body.delivery_notes ?? null,
        zone_id: body.zone_id ?? null,
        payment_method: method
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
      const order = await getOrderByPayPalId(paypalOrderId);
      if (!order) {
        return res.status(404).json({ error: "No matching order found for this PayPal payment." });
      }
      if (order.payment_status === "paid") {
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
