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
} from "./payment";

// Compare two monetary amounts at cent precision.
function amountsMatch(a: number, b: number): boolean {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
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
      };

      const method = body.payment_method === "online_card" ? "online_card" : "cash_on_delivery";

      if (!body.customer_name?.trim())    return res.status(400).json({ error: "Name is required." });
      if (!body.customer_phone?.trim())   return res.status(400).json({ error: "Phone is required." });
      if (!body.delivery_address?.trim()) return res.status(400).json({ error: "Delivery address is required." });
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty." });
      }

      const result = await createServerOrder({
        items: (body.items ?? []).map((it) => ({
          product_id: String(it.product_id ?? ""),
          quantity:   Number(it.quantity ?? 0),
        })),
        customer_name:    body.customer_name,
        customer_phone:   body.customer_phone,
        delivery_address: body.delivery_address,
        delivery_notes:   body.delivery_notes ?? null,
        zone_id:          body.zone_id ?? null,
        payment_method:   method,
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

      // Look up the local order this PayPal token is bound to
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

  const httpServer = createServer(app);
  return httpServer;
}
