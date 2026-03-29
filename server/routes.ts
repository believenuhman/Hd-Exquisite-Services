import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  createPaymentSession,
  verifyPayment,
  handleStripeWebhook,
  verifyWiPayHash,
  updateOrderPaid,
  updateOrderFailed,
  getSupabaseAdmin,
} from "./payment";

async function handleWiPayReturn(
  orderId: string,
  params: Record<string, string>,
  req: Request,
  res: Response,
) {
  const { status, hash, transaction_id: transactionId, reasonDescription } = params;

  console.log("[wipay return]", { orderId, status, transactionId, hash, reasonDescription });

  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "localhost";
  const frontendOrigin = `${proto}://${host}`;

  if (!orderId) {
    return res.redirect(`${frontendOrigin}/payment/failed?reason=missing_order`);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("total")
      .eq("id", orderId)
      .single();

    const total = order ? Number(order.total).toFixed(2) : "0.00";
    const hashValid = transactionId && hash ? verifyWiPayHash(transactionId, total, hash) : false;

    console.log("[wipay return] hash check:", { total, hashValid });

    if (status === "success" && hashValid) {
      await updateOrderPaid(orderId, transactionId, "wipay");
      return res.redirect(
        `${frontendOrigin}/payment/success?orderId=${encodeURIComponent(orderId)}&ref=${encodeURIComponent(transactionId)}&gateway=wipay`,
      );
    } else {
      await updateOrderFailed(orderId);
      const reason = encodeURIComponent(
        reasonDescription || (hashValid ? "Payment failed" : "Invalid payment response"),
      );
      return res.redirect(`${frontendOrigin}/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=${reason}`);
    }
  } catch (err) {
    console.error("[wipay return] Error:", err);
    return res.redirect(`${frontendOrigin}/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=server_error`);
  }
}

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

      return res.json({ url: session.url, reference: session.reference, gateway: session.gateway, formParams: session.formParams });
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

  // WiPay return handler — GET redirect (WiPay appends query params to response_url)
  app.get("/api/payment/wipay/return/:orderId", async (req: Request, res: Response) => {
    const orderId = req.params.orderId ?? "";
    const params = req.query as Record<string, string>;
    return handleWiPayReturn(orderId, params, req, res);
  });

  // WiPay return handler — POST fallback (some WiPay configurations POST)
  app.post("/api/payment/wipay/return/:orderId", async (req: Request, res: Response) => {
    const orderId = req.params.orderId ?? "";
    const params = { ...req.query, ...req.body } as Record<string, string>;
    return handleWiPayReturn(orderId, params, req, res);
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
