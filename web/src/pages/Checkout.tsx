import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoChevronBack, IoCheckmarkCircle, IoAlertCircle, IoCard, IoCash } from "react-icons/io5";
import { supabase, DeliveryZone } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/storage";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";

type PaymentMethod = "cash_on_delivery" | "online_card";

// Derive the API base from the current page origin so it works on any domain.
function getApiBase(): string {
  // Backend runs on port 3000 in dev; same origin in production.
  if (import.meta.env.DEV) return "http://localhost:3000";
  return window.location.origin;
}

export function Checkout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useAppSettings();
  const { user }  = useAuth();

  const [zones, setZones]               = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [name, setName]       = useState(() => storage.get("hd_saved_name")    ?? user?.user_metadata?.full_name ?? "");
  const [phone, setPhone]     = useState(() => storage.get("hd_saved_phone")   ?? user?.user_metadata?.phone     ?? "");
  const [address, setAddress] = useState(() => storage.get("hd_saved_address") ?? storage.get("hd_profile_address") ?? "");
  const [notes, setNotes]     = useState("");
  const [ageConfirm, setAgeConfirm]   = useState(false);
  const [idConfirm, setIdConfirm]     = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Show cancellation notice if user came back from PayPal and cancelled
  const cancelledNotice = (location.state as { paypalCancelled?: boolean } | null)?.paypalCancelled;

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true)
      .then(({ data }) => { if (data) setZones(data as DeliveryZone[]); });
  }, []);

  const deliveryFee  = selectedZone?.fee ?? (settings?.flat_fee ?? 0);
  const total        = subtotal + deliveryFee;
  const sym          = settings?.currency_symbol ?? "$";
  const currencyCode = settings?.currency_code ?? "USD";

  const validate = (): string | null => {
    if (!name.trim())    return "Please enter your name.";
    if (!phone.trim())   return "Please enter your phone number.";
    if (!address.trim()) return "Please enter your delivery address.";
    if (!ageConfirm)     return "You must confirm you are 18+ years old.";
    if (!idConfirm)      return "You must confirm you have valid ID.";
    if (items.length === 0) return "Your cart is empty.";
    return null;
  };

  const createOrder = async (method: PaymentMethod) => {
    const baseFields = {
      customer_name:    name.trim(),
      customer_phone:   phone.trim(),
      delivery_address: address.trim(),
      delivery_notes:   notes.trim() || null,
      age_confirmed:    true,
      status:           "received",
      subtotal,
      delivery_fee:     deliveryFee,
      total,
      currency_code:    currencyCode,
      currency_symbol:  sym,
      zone_id:          selectedZone?.id ?? null,
    };

    const paymentFields = {
      payment_method: method,
      payment_status: "pending",
      gateway_name:   method === "online_card" ? "paypal" : null,
    };

    let res = await supabase
      .from("orders")
      .insert({ ...baseFields, ...paymentFields })
      .select()
      .single();

    // Graceful fallback if payment columns haven't been migrated yet
    if (res.error?.code === "PGRST204" || res.error?.code === "42703") {
      console.warn("[checkout] Payment columns missing — run supabase-payment-migration.sql");
      res = await supabase.from("orders").insert(baseFields).select().single();
    }

    if (res.error) throw new Error("Failed to create order: " + res.error.message);

    const order = res.data;
    await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id:   order.id,
        product_id: item.product.id,
        name:       item.product.name,
        qty:        item.quantity,
        unit_price: item.product.price,
      }))
    );
    return order;
  };

  const handlePlaceOrder = async () => {
    if (submittingRef.current) return;
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError(null);
    submittingRef.current = true;
    setLoading(true);

    storage.set("hd_saved_name",    name.trim());
    storage.set("hd_saved_phone",   phone.trim());
    storage.set("hd_saved_address", address.trim());

    try {
      const order = await createOrder(paymentMethod);

      if (paymentMethod === "cash_on_delivery") {
        clearCart();
        submittingRef.current = false;
        setLoading(false);
        navigate(`/order-tracking/${order.id}`);
        return;
      }

      // ── PayPal online payment ──────────────────────────────────────────────
      // 1. Ask the backend to create a PayPal order and give us the approval URL
      const apiRes = await fetch(`${getApiBase()}/api/paypal/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:     order.id,
          amount:      total,
          currency:    currencyCode,
          description: `HD Xquisite Liquors Order #${order.id.slice(0, 8).toUpperCase()}`,
          origin:      window.location.origin,
        }),
      });

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(err.error ?? `PayPal API error (${apiRes.status})`);
      }

      const { approvalUrl } = await apiRes.json() as { paypalOrderId: string; approvalUrl: string };

      // 2. Save the Supabase order ID so PaymentSuccess can capture & update it
      localStorage.setItem(PENDING_ORDER_KEY, order.id);
      clearCart();

      // 3. Redirect to PayPal — keep loading=true, we're leaving the page
      window.location.href = approvalUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      submittingRef.current = false;
      setLoading(false);
      setError(msg);
    }
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "#09090C" }}>
        <p className="font-inter text-white mb-4">Your cart is empty</p>
        <button onClick={() => navigate("/")}
          className="px-6 py-3 rounded-2xl font-inter font-bold text-sm press-active"
          style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
          Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-xl">Checkout</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-5" style={{ paddingBottom: 100 }}>

        {/* PayPal cancellation notice */}
        {cancelledNotice && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.25)" }}>
            <IoAlertCircle size={16} color="#E4A12B" />
            <span className="font-inter text-sm" style={{ color: "#E4A12B" }}>Payment was cancelled. You can try again or choose Cash on Delivery.</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <IoAlertCircle size={16} color="#DC3545" />
            <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
          </div>
        )}

        {/* Delivery details */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "#E4A12B" }}>Delivery Details</p>
          {[
            { label: "Full Name",        value: name,    onChange: setName,    placeholder: "Your full name",       type: "text" },
            { label: "Phone Number",     value: phone,   onChange: setPhone,   placeholder: "+1 555 000 0000",      type: "tel"  },
            { label: "Delivery Address", value: address, onChange: setAddress, placeholder: "Street address, city", type: "text" },
          ].map(({ label, value, onChange, placeholder, type }) => (
            <div key={label} className="mb-4">
              <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
              <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl px-4 font-inter text-sm text-white"
                style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
            </div>
          ))}
          <div>
            <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Delivery Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..."
              className="w-full rounded-xl px-4 py-3 font-inter text-sm text-white resize-none"
              style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 80 }} />
          </div>
        </div>

        {/* Delivery Zone */}
        {zones.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
            <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Delivery Zone</p>
            <div className="flex flex-col gap-2">
              {zones.map((zone) => (
                <button key={zone.id} onClick={() => setSelectedZone(zone)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 press-active"
                  style={{ background: selectedZone?.id === zone.id ? "rgba(228,161,43,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedZone?.id === zone.id ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                  <span className="font-inter text-sm text-white">{zone.name}</span>
                  <span className="font-inter text-sm font-bold" style={{ color: selectedZone?.id === zone.id ? "#E4A12B" : "rgba(255,255,255,0.5)" }}>{sym}{zone.fee.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Order Summary</p>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between mb-2">
              <span className="font-inter text-sm text-white">{product.name} ×{quantity}</span>
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{sym}{(product.price * quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(228,161,43,0.1)", margin: "12px 0" }} />
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Subtotal</span>
            <span className="font-inter text-sm text-white">{sym}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Delivery</span>
            <span className="font-inter text-sm text-white">{selectedZone ? `${sym}${deliveryFee.toFixed(2)}` : "Select zone"}</span>
          </div>
          <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(228,161,43,0.1)" }}>
            <span className="font-inter font-bold text-white">Total</span>
            <span className="font-inter font-bold text-xl" style={{ color: "#E4A12B" }}>{sym}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Age / ID confirmations */}
        {[
          { val: ageConfirm, set: setAgeConfirm, label: "I confirm I am 18+ years of age" },
          { val: idConfirm,  set: setIdConfirm,  label: "I confirm I have valid government-issued ID" },
        ].map(({ val, set, label }) => (
          <button key={label} onClick={() => set((v) => !v)} className="flex items-center gap-3 press-active">
            <div className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 24, height: 24, background: val ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)", border: `1px solid ${val ? "transparent" : "rgba(255,255,255,0.2)"}` }}>
              {val && <IoCheckmarkCircle size={16} color="#09090C" />}
            </div>
            <span className="font-inter text-sm text-left" style={{ color: val ? "#E4A12B" : "rgba(255,255,255,0.55)" }}>{label}</span>
          </button>
        ))}

        {/* Payment Method */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Payment Method</p>
          <div className="flex flex-col gap-3">

            {/* Cash on Delivery */}
            <button onClick={() => setPaymentMethod("cash_on_delivery")}
              className="flex items-center gap-4 rounded-xl p-4 press-active text-left"
              style={{ background: paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.08)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 40, height: 40, background: paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.15)" : "rgba(255,255,255,0.05)" }}>
                <IoCash size={20} color={paymentMethod === "cash_on_delivery" ? "#E4A12B" : "rgba(255,255,255,0.4)"} />
              </div>
              <div className="flex-1">
                <p className="font-inter text-sm font-semibold" style={{ color: paymentMethod === "cash_on_delivery" ? "#fff" : "rgba(255,255,255,0.6)" }}>Cash on Delivery</p>
                <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Pay when your order arrives</p>
              </div>
              <div className="flex-shrink-0 rounded-full"
                style={{ width: 18, height: 18, border: `2px solid ${paymentMethod === "cash_on_delivery" ? "#E4A12B" : "rgba(255,255,255,0.2)"}`, background: paymentMethod === "cash_on_delivery" ? "#E4A12B" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {paymentMethod === "cash_on_delivery" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#09090C" }} />}
              </div>
            </button>

            {/* Pay Online — PayPal */}
            <button onClick={() => setPaymentMethod("online_card")}
              className="flex items-center gap-4 rounded-xl p-4 press-active text-left"
              style={{ background: paymentMethod === "online_card" ? "rgba(0,112,186,0.08)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${paymentMethod === "online_card" ? "rgba(0,112,186,0.45)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 40, height: 40, background: paymentMethod === "online_card" ? "rgba(0,112,186,0.12)" : "rgba(255,255,255,0.05)" }}>
                <IoCard size={20} color={paymentMethod === "online_card" ? "#0070BA" : "rgba(255,255,255,0.4)"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-inter text-sm font-semibold" style={{ color: paymentMethod === "online_card" ? "#fff" : "rgba(255,255,255,0.6)" }}>Pay Online</p>
                  {/* PayPal wordmark badge */}
                  <span className="font-inter font-bold rounded-full px-2 py-0.5"
                    style={{ background: "rgba(0,112,186,0.15)", border: "1px solid rgba(0,112,186,0.35)", color: "#0070BA", fontSize: 9, letterSpacing: "0.04em" }}>
                    PAYPAL
                  </span>
                  <span className="font-inter font-bold rounded-full px-2 py-0.5"
                    style={{ background: "rgba(76,175,80,0.12)", border: "1px solid rgba(76,175,80,0.25)", color: "#4CAF50", fontSize: 9 }}>
                    SECURE
                  </span>
                </div>
                <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Credit / Debit card via PayPal</p>
              </div>
              <div className="flex-shrink-0 rounded-full"
                style={{ width: 18, height: 18, border: `2px solid ${paymentMethod === "online_card" ? "#0070BA" : "rgba(255,255,255,0.2)"}`, background: paymentMethod === "online_card" ? "#0070BA" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {paymentMethod === "online_card" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
              </div>
            </button>
          </div>

          {/* PayPal info note */}
          {paymentMethod === "online_card" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(0,112,186,0.06)", border: "1px solid rgba(0,112,186,0.2)" }}>
              <span className="text-sm" style={{ marginTop: 1 }}>🔒</span>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                You'll be redirected to PayPal's secure hosted page. Pay with your PayPal account or any credit/debit card. Your card details are never stored by us.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Place order / Pay with PayPal button */}
      <div className="flex-shrink-0 px-4 pt-2"
        style={{ background: "rgba(9,9,12,0.98)", borderTop: "1px solid rgba(228,161,43,0.1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <button onClick={handlePlaceOrder} disabled={loading}
          className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active"
          style={{
            background: loading
              ? "rgba(228,161,43,0.3)"
              : paymentMethod === "online_card"
              ? "linear-gradient(135deg, #003087, #0070BA)"
              : "linear-gradient(135deg, #D4901A, #F5C842)",
            color: "#fff",
            opacity: loading ? 0.7 : 1,
          }}>
          {loading
            ? (paymentMethod === "online_card" ? "Connecting to PayPal..." : "Placing Order...")
            : paymentMethod === "online_card"
            ? `PAY WITH PAYPAL · ${sym}${total.toFixed(2)}`
            : `PLACE ORDER · ${sym}${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
