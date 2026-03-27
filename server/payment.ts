import { createClient } from "@supabase/supabase-js";

const GATEWAY = process.env.PAYMENT_GATEWAY ?? "mock";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase credentials not configured");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export type PaymentSessionRequest = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentSessionResult = {
  url: string;
  reference: string;
  gateway: string;
};

export type PaymentVerifyResult = {
  success: boolean;
  paid: boolean;
  reference: string;
  gateway: string;
};

function isStripeMode(): boolean {
  return (GATEWAY === "stripe" || Boolean(STRIPE_SECRET_KEY)) && Boolean(STRIPE_SECRET_KEY);
}

async function createStripeSession(req: PaymentSessionRequest): Promise<PaymentSessionResult> {
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
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: req.orderId },
    success_url: `${req.successUrl}?orderId=${req.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.cancelUrl}?orderId=${req.orderId}`,
  });

  return {
    url: session.url ?? req.successUrl,
    reference: session.id,
    gateway: "stripe",
  };
}

async function createMockSession(req: PaymentSessionRequest): Promise<PaymentSessionResult> {
  const reference = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin = new URL(req.successUrl).origin;
  return {
    url: `${origin}/payment/mock/${req.orderId}?ref=${reference}&success=${encodeURIComponent(req.successUrl)}&cancel=${encodeURIComponent(req.cancelUrl)}`,
    reference,
    gateway: "mock",
  };
}

export async function createPaymentSession(req: PaymentSessionRequest): Promise<PaymentSessionResult> {
  if (isStripeMode()) {
    return createStripeSession(req);
  }
  return createMockSession(req);
}

async function verifyStripeSession(sessionId: string): Promise<{ paid: boolean; reference: string }> {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === "paid",
    reference: session.id,
  };
}

export async function verifyPayment(
  orderId: string,
  reference: string,
  gateway: string,
): Promise<PaymentVerifyResult> {
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

export async function updateOrderPaid(orderId: string, reference: string, gateway: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({
      payment_status: "paid",
      payment_reference: reference,
      gateway_name: gateway,
      paid_at: new Date().toISOString(),
    }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order paid status:", err);
  }
}

export async function updateOrderFailed(orderId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order failed status:", err);
  }
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<{ handled: boolean; orderId?: string }> {
  if (!isStripeMode() || !STRIPE_WEBHOOK_SECRET) {
    return { handled: false };
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new Error("Webhook signature verification failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      await updateOrderPaid(orderId, session.id, "stripe");
      return { handled: true, orderId };
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await updateOrderFailed(orderId);
      return { handled: true, orderId };
    }
  }

  return { handled: true };
}
