// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/payment.ts
import { createClient } from "@supabase/supabase-js";
var GATEWAY = process.env.PAYMENT_GATEWAY ?? "mock";
var STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
var SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase credentials not configured");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
function isStripeMode() {
  return (GATEWAY === "stripe" || Boolean(STRIPE_SECRET_KEY)) && Boolean(STRIPE_SECRET_KEY);
}
async function createStripeSession(req) {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const amountInCents = Math.round(req.amount * 100);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: req.currency.toLowerCase(),
          product_data: { name: req.description },
          unit_amount: amountInCents
        },
        quantity: 1
      }
    ],
    metadata: { orderId: req.orderId },
    success_url: `${req.successUrl}?orderId=${req.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.cancelUrl}?orderId=${req.orderId}`
  });
  return {
    url: session.url ?? req.successUrl,
    reference: session.id,
    gateway: "stripe"
  };
}
async function createMockSession(req) {
  const reference = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin = new URL(req.successUrl).origin;
  return {
    url: `${origin}/payment/mock/${req.orderId}?ref=${reference}&success=${encodeURIComponent(req.successUrl)}&cancel=${encodeURIComponent(req.cancelUrl)}`,
    reference,
    gateway: "mock"
  };
}
async function createPaymentSession(req) {
  if (isStripeMode()) {
    return createStripeSession(req);
  }
  return createMockSession(req);
}
async function verifyStripeSession(sessionId) {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === "paid",
    reference: session.id
  };
}
async function verifyPayment(orderId, reference, gateway) {
  if (gateway === "stripe" && isStripeMode()) {
    const { paid, reference: ref } = await verifyStripeSession(reference);
    if (paid) {
      await updateOrderPaid(orderId, ref, "stripe");
    }
    return { success: true, paid, reference: ref, gateway: "stripe" };
  }
  if (gateway === "mock" || reference.startsWith("mock_")) {
    await updateOrderPaid(orderId, reference, "mock");
    return { success: true, paid: true, reference, gateway: "mock" };
  }
  return { success: false, paid: false, reference, gateway };
}
async function updateOrderPaid(orderId, reference, gateway) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({
      payment_status: "paid",
      payment_reference: reference,
      gateway_name: gateway,
      paid_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order paid status:", err);
  }
}
async function updateOrderFailed(orderId) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order failed status:", err);
  }
}
async function handleStripeWebhook(rawBody, signature) {
  if (!isStripeMode() || !STRIPE_WEBHOOK_SECRET) {
    return { handled: false };
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new Error("Webhook signature verification failed");
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      await updateOrderPaid(orderId, session.id, "stripe");
      return { handled: true, orderId };
    }
  }
  if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await updateOrderFailed(orderId);
      return { handled: true, orderId };
    }
  }
  return { handled: true };
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/payment/create-session", async (req, res) => {
    try {
      const { orderId, amount, currency, description, origin } = req.body;
      if (!orderId || !amount || !currency || !origin) {
        return res.status(400).json({ error: "Missing required fields: orderId, amount, currency, origin" });
      }
      const successUrl = `${origin}/payment/success`;
      const cancelUrl = `${origin}/payment/cancelled`;
      const session = await createPaymentSession({
        orderId,
        amount,
        currency,
        description: description || "HD Xquisite Liquors Order",
        successUrl,
        cancelUrl
      });
      return res.json({ url: session.url, reference: session.reference, gateway: session.gateway });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment session creation failed";
      console.error("[/api/payment/create-session]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/payment/verify", async (req, res) => {
    try {
      const { orderId, reference, gateway } = req.body;
      if (!orderId || !reference) {
        return res.status(400).json({ error: "Missing orderId or reference" });
      }
      const result = await verifyPayment(orderId, reference, gateway ?? "mock");
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment verification failed";
      console.error("[/api/payment/verify]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/payment/webhook", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });
      const rawBody = req.rawBody;
      if (!rawBody) return res.status(400).json({ error: "Missing raw body" });
      const result = await handleStripeWebhook(rawBody, sig);
      return res.json({ received: true, handled: result.handled, orderId: result.orderId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook processing failed";
      console.error("[/api/payment/webhook]", err);
      return res.status(400).json({ error: message });
    }
  });
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
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
