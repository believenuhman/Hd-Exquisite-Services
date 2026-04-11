import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  isPayPalConfigured,
  createPayPalOrder,
  capturePayPalOrder,
  updateOrderPaid,
  updateOrderCancelled,
  updateOrderFailed,
  getSupabaseAdmin,
} from "./payment";

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      paypal: isPayPalConfigured() ? "configured" : "not configured",
    });
  });

  // ── POST /api/paypal/create-order ─────────────────────────────────────────
  // Creates a PayPal order and returns the approval URL.
  // The frontend stores the Supabase orderId in localStorage, then redirects
  // the user to the PayPal approval URL. On return, PayPal appends
  // ?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID to the return_url.
  app.post("/api/paypal/create-order", async (req: Request, res: Response) => {
    try {
      const { orderId, amount, currency, description, origin } = req.body as {
        orderId: string;
        amount: number;
        currency: string;
        description?: string;
        origin: string;
      };

      if (!orderId || !amount || !currency || !origin) {
        return res.status(400).json({
          error: "Missing required fields: orderId, amount, currency, origin",
        });
      }

      if (!isPayPalConfigured()) {
        return res.status(503).json({
          error: "PayPal is not configured on this server. Contact the store owner.",
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
        cancelUrl,
      });

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
  // Captures a PayPal order after the user approves it, then marks the
  // corresponding Supabase order as paid.
  app.post("/api/paypal/capture-order", async (req: Request, res: Response) => {
    try {
      const { paypalOrderId, orderId } = req.body as {
        paypalOrderId: string; // token returned by PayPal in the redirect
        orderId: string;       // HD Xquisite Supabase order UUID
      };

      if (!paypalOrderId || !orderId) {
        return res.status(400).json({
          error: "Missing required fields: paypalOrderId, orderId",
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to capture PayPal order";
      console.error("[POST /api/paypal/capture-order]", err);
      // Don't mark order failed on server errors — let the frontend handle it
      return res.status(500).json({ error: message });
    }
  });

  // ── POST /api/paypal/cancel-order ─────────────────────────────────────────
  // Called when the user lands on /payment-cancelled after backing out of PayPal.
  app.post("/api/paypal/cancel-order", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body as { orderId: string };
      if (!orderId) return res.status(400).json({ error: "Missing orderId" });
      await updateOrderCancelled(orderId);
      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      console.error("[POST /api/paypal/cancel-order]", err);
      return res.status(500).json({ error: message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
