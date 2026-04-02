import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoCheckmarkCircle, IoAlertCircle, IoCard, IoCash, IoWarning } from "react-icons/io5";
import { supabase, DeliveryZone } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/storage";

// WiPay hosted payment link — set VITE_WIPAY_PAYMENT_LINK in your environment secrets
const WIPAY_PAYMENT_LINK = import.meta.env.VITE_WIPAY_PAYMENT_LINK || "";

// Optional: override the return URLs WiPay redirects to (must also be set in WiPay dashboard)
const WIPAY_SUCCESS_URL = import.meta.env.VITE_WIPAY_SUCCESS_URL || "/payment-success";
const WIPAY_CANCEL_URL  = import.meta.env.VITE_WIPAY_CANCEL_URL  || "/payment-cancelled";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";

type PaymentMethod = "cash_on_delivery" | "online_card";

export function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [name, setName]       = useState(() => storage.get("hd_saved_name")    ?? user?.user_metadata?.full_name ?? "");
  const [phone, setPhone]     = useState(() => storage.get("hd_saved_phone")   ?? user?.user_metadata?.phone     ?? "");
  const [address, setAddress] = useState(() => storage.get("hd_saved_address") ?? storage.get("hd_profile_address") ?? "");
  const [notes, setNotes]     = useState("");
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [idConfirm, setIdConfirm]   = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const submittingRef = useRef(false);

  const wipayConfigured = !!WIPAY_PAYMENT_LINK;

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true)
      .then(({ data }) => { if (data) setZones(data as DeliveryZone[]); });
  }, []);

  const deliveryFee = selectedZone?.fee ?? (settings?.flat_fee ?? 0);
  const total       = subtotal + deliveryFee;
  const sym         = settings?.currency_symbol ?? "$";
  const currencyCode = settings?.currency_code ?? "USD";

  const validate = (): string | null => {
    if (!name.trim())    return "Please enter your name.";
    if (!phone.trim())   return "Please enter your phone number.";
    if (!address.trim()) return "Please enter your delivery address.";
    if (!ageConfirm)     return "You must confirm you are 18+ years old.";
    if (!idConfirm)      return "You must confirm you have valid ID.";
    if (items.length === 0) return "Your cart is empty.";
    if (paymentMethod === "online_card" && !wipayConfigured)
      return "Online payment is not yet configured. Please choose Cash on Delivery or contact support.";
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
      gateway_name:   method === "online_card" ? "wipay" : null,
    };

    let res = await supabase
      .from("orders")
      .insert({ ...baseFields, ...paymentFields })
      .select()
      .single();

    // If payment columns don't exist (migration not yet applied), retry without them
    if (res.error?.code === "PGRST204" || res.error?.code === "42703") {
      console.warn("[checkout] Payment columns missing — run supabase-payment-migration.sql in Supabase SQL Editor");
      res = await supabase.from("orders").insert(baseFields).select().single();
    }

    if (res.error) throw new Error("Failed to create order: " + res.error.message);

    const order = res.data;
    const orderItems = items.map((item) => ({
      order_id:   order.id,
      product_id: item.product.id,
      name:       item.product.name,
      qty:        item.quantity,
      unit_price: item.product.price,
    }));
    await supabase.from("order_items").insert(orderItems);
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
        setLoading(false);
        submittingRef.current = false;
        navigate(`/order-tracking/${order.id}`);
        return;
      }

      // Online payment via WiPay hosted checkout
      // Save order ID so we can update it after WiPay returns
      localStorage.setItem(PENDING_ORDER_KEY, order.id);
      clearCart();

      // Build the WiPay redirect URL (keep loading=true — we're leaving the page)
      // WiPay does not support query-string injection; success/cancel URLs are configured
      // in the WiPay merchant dashboard. Store the return paths for reference.
      localStorage.setItem("hd_wipay_success_url", WIPAY_SUCCESS_URL);
      localStorage.setItem("hd_wipay_cancel_url",  WIPAY_CANCEL_URL);

      window.location.href = WIPAY_PAYMENT_LINK;
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
            { label: "Full Name",         value: name,    onChange: setName,    placeholder: "Your full name",          type: "text" },
            { label: "Phone Number",      value: phone,   onChange: setPhone,   placeholder: "+1 555 000 0000",         type: "tel"  },
            { label: "Delivery Address",  value: address, onChange: setAddress, placeholder: "Street address, city",    type: "text" },
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

            {/* Pay Online — WiPay */}
            <button onClick={() => setPaymentMethod("online_card")}
              className="flex items-center gap-4 rounded-xl p-4 press-active text-left"
              style={{ background: paymentMethod === "online_card" ? "rgba(228,161,43,0.06)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${paymentMethod === "online_card" ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 40, height: 40, background: paymentMethod === "online_card" ? "rgba(228,161,43,0.12)" : "rgba(255,255,255,0.05)" }}>
                <IoCard size={20} color={paymentMethod === "online_card" ? "#E4A12B" : "rgba(255,255,255,0.4)"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-inter text-sm font-semibold" style={{ color: paymentMethod === "online_card" ? "#fff" : "rgba(255,255,255,0.6)" }}>Pay Online</p>
                  <span className="font-inter font-bold rounded-full px-2 py-0.5" style={{ background: "rgba(228,161,43,0.15)", border: "1px solid rgba(228,161,43,0.3)", color: "#E4A12B", fontSize: 9, letterSpacing: "0.04em" }}>WIPAY</span>
                  <span className="font-inter font-bold rounded-full px-2 py-0.5" style={{ background: "rgba(76,175,80,0.12)", border: "1px solid rgba(76,175,80,0.25)", color: "#4CAF50", fontSize: 9 }}>SECURE</span>
                </div>
                <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Credit / Debit card via WiPay</p>
              </div>
              <div className="flex-shrink-0 rounded-full"
                style={{ width: 18, height: 18, border: `2px solid ${paymentMethod === "online_card" ? "#E4A12B" : "rgba(255,255,255,0.2)"}`, background: paymentMethod === "online_card" ? "#E4A12B" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {paymentMethod === "online_card" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#09090C" }} />}
              </div>
            </button>
          </div>

          {/* WiPay info note */}
          {paymentMethod === "online_card" && wipayConfigured && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(228,161,43,0.05)", border: "1px solid rgba(228,161,43,0.18)" }}>
              <span className="text-sm" style={{ marginTop: 1 }}>🔒</span>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                You'll be redirected to WiPay's secure hosted page. Your card details are never stored by us.
              </p>
            </div>
          )}

          {/* WiPay not configured warning */}
          {paymentMethod === "online_card" && !wipayConfigured && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(228,161,43,0.07)", border: "1px solid rgba(228,161,43,0.25)" }}>
              <IoWarning size={16} color="#E4A12B" style={{ marginTop: 1, flexShrink: 0 }} />
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                Online payment is not yet activated. Please select Cash on Delivery or contact support.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Place order / Pay online button */}
      <div className="flex-shrink-0 px-4 pt-2"
        style={{ background: "rgba(9,9,12,0.98)", borderTop: "1px solid rgba(228,161,43,0.1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <button onClick={handlePlaceOrder} disabled={loading || (paymentMethod === "online_card" && !wipayConfigured)}
          className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active"
          style={{
            background: loading
              ? "rgba(228,161,43,0.3)"
              : (paymentMethod === "online_card" && !wipayConfigured)
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(135deg, #D4901A, #F5C842)",
            color: (paymentMethod === "online_card" && !wipayConfigured) ? "rgba(255,255,255,0.25)" : "#09090C",
            cursor: (paymentMethod === "online_card" && !wipayConfigured) ? "not-allowed" : "pointer",
          }}>
          {loading
            ? (paymentMethod === "online_card" ? "Saving Order..." : "Placing Order...")
            : paymentMethod === "online_card"
            ? (wipayConfigured ? `PAY WITH WIPAY · ${sym}${total.toFixed(2)}` : "ONLINE PAYMENT UNAVAILABLE")
            : `PLACE ORDER · ${sym}${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
