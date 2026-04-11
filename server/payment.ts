import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    throw new Error("Supabase credentials not configured (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── PayPal configuration ─────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID     ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const PAYPAL_ENV           = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();

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
    purchase_units: { payments: { captures: { id: string; status: string }[] } }[];
  };

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id ?? paypalOrderId;
  const success = data.status === "COMPLETED" || capture?.status === "COMPLETED";

  console.log(`[paypal] Captured order ${paypalOrderId}: status=${data.status}, captureId=${captureId}`);

  return { success, captureId, status: data.status };
}

// ─── Order status helpers ─────────────────────────────────────────────────────

export async function updateOrderPaid(orderId: string, reference: string, gateway: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").update({
      payment_status:    "paid",
      payment_reference: reference,
      gateway_name:      gateway,
      paid_at:           new Date().toISOString(),
    }).eq("id", orderId);
    if (error) console.error("[payment] updateOrderPaid error:", error);
  } catch (err) {
    console.error("[payment] Failed to update order paid status:", err);
  }
}

export async function updateOrderCancelled(orderId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("orders").update({ payment_status: "cancelled" }).eq("id", orderId);
  } catch (err) {
    console.error("[payment] Failed to update order cancelled status:", err);
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
