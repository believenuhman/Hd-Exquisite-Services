import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createPaymentSession, verifyPayment, handleStripeWebhook } from "./payment";

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/payment/create-session", async (req: Request, res: Response) => {
    try {
      const { orderId, amount, currency, description, origin } = req.body as {
        orderId: string;
        amount: number;
        currency: string;
        description: string;
        origin: string;
      };

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
        cancelUrl,
      });

      return res.json({ url: session.url, reference: session.reference, gateway: session.gateway });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment session creation failed";
      console.error("[/api/payment/create-session]", err);
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { orderId, reference, gateway } = req.body as {
        orderId: string;
        reference: string;
        gateway: string;
      };

      if (!orderId || !reference) {
        return res.status(400).json({ error: "Missing orderId or reference" });
      }

      const result = await verifyPayment(orderId, reference, gateway ?? "mock");
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment verification failed";
      console.error("[/api/payment/verify]", err);
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/payment/webhook", async (req: Request, res: Response) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

      const rawBody = req.rawBody as Buffer;
      if (!rawBody) return res.status(400).json({ error: "Missing raw body" });

      const result = await handleStripeWebhook(rawBody, sig);
      return res.json({ received: true, handled: result.handled, orderId: result.orderId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Webhook processing failed";
      console.error("[/api/payment/webhook]", err);
      return res.status(400).json({ error: message });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
