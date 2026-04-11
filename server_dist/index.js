// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/payment.ts
import { createClient } from "@supabase/supabase-js";
var SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    throw new Error("Supabase credentials not configured (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
var PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
var PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
var PAYPAL_ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
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
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id ?? paypalOrderId;
  const success = data.status === "COMPLETED" || capture?.status === "COMPLETED";
  console.log(`[paypal] Captured order ${paypalOrderId}: status=${data.status}, captureId=${captureId}`);
  return { success, captureId, status: data.status };
}
async function updateOrderPaid(orderId, reference, gateway) {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").update({
      payment_status: "paid",
      payment_reference: reference,
      gateway_name: gateway,
      paid_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderId);
    if (error) console.error("[payment] updateOrderPaid error:", error);
  } catch (err) {
    console.error("[payment] Failed to update order paid status:", err);
  }
}
async function updateOrderCancelled(orderId) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({ payment_status: "cancelled" }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order cancelled status:", err);
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

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      paypal: isPayPalConfigured() ? "configured" : "not configured"
    });
  });
  app2.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { orderId, amount, currency, description, origin } = req.body;
      if (!orderId || !amount || !currency || !origin) {
        return res.status(400).json({
          error: "Missing required fields: orderId, amount, currency, origin"
        });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({
          error: "PayPal is not configured on this server. Contact the store owner."
        });
      }
      const returnUrl = `${origin}/payment-success`;
      const cancelUrl = `${origin}/payment-cancelled`;
      const result = await createPayPalOrder({
        orderId,
        amount,
        currency,
        description: description || "HD Xquisite Liquors Order",
        returnUrl,
        cancelUrl
      });
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
      const { paypalOrderId, orderId } = req.body;
      if (!paypalOrderId || !orderId) {
        return res.status(400).json({
          error: "Missing required fields: paypalOrderId, orderId"
        });
      }
      if (!isPayPalConfigured()) {
        return res.status(503).json({ error: "PayPal is not configured" });
      }
      const result = await capturePayPalOrder(paypalOrderId);
      if (result.success) {
        await updateOrderPaid(orderId, result.captureId, "paypal");
        return res.json({ success: true, captureId: result.captureId, status: result.status });
      } else {
        await updateOrderFailed(orderId);
        return res.status(402).json({ success: false, status: result.status, error: "Payment capture was not completed" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to capture PayPal order";
      console.error("[POST /api/paypal/capture-order]", err);
      return res.status(500).json({ error: message });
    }
  });
  app2.post("/api/paypal/cancel-order", async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: "Missing orderId" });
      await updateOrderCancelled(orderId);
      return res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      console.error("[POST /api/paypal/cancel-order]", err);
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
