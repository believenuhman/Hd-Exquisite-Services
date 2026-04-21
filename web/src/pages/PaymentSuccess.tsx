import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCheckmarkCircle, IoReceiptOutline, IoHome, IoAlertCircle } from "react-icons/io5";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";

type Status = "loading" | "confirmed" | "error";

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // PayPal appends ?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID to the return URL
  const paypalToken  = searchParams.get("token")   ?? "";
  const queryOrderId = searchParams.get("orderId") ?? ""; // fallback

  const [status, setStatus]         = useState<Status>("loading");
  const [orderId, setOrderId]       = useState<string>("");
  const [captureId, setCaptureId]   = useState<string>("");

  useEffect(() => {
    confirmPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmPayment = async () => {
    // We need the PayPal token to confirm payment. Without it we can't capture.
    if (!paypalToken) {
      const fallbackId = localStorage.getItem(PENDING_ORDER_KEY) ?? queryOrderId;
      if (fallbackId) setOrderId(fallbackId);
      localStorage.removeItem(PENDING_ORDER_KEY);
      setStatus("error");
      return;
    }

    try {
      // Server captures, verifies amount/currency/binding, and tells us
      // which local order this payment belongs to.
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId: paypalToken }),
      });

      const data = await res.json() as { success?: boolean; orderId?: string; captureId?: string; error?: string };

      if (res.ok && data.success) {
        if (data.orderId)   setOrderId(data.orderId);
        if (data.captureId) setCaptureId(data.captureId);
        localStorage.removeItem(PENDING_ORDER_KEY);
        setStatus("confirmed");
      } else {
        console.warn("[payment-success] capture failed:", data);
        // Fall back to the locally stored order id for the error screen link
        const fallbackId = localStorage.getItem(PENDING_ORDER_KEY) ?? queryOrderId;
        if (fallbackId) setOrderId(fallbackId);
        localStorage.removeItem(PENDING_ORDER_KEY);
        setStatus("error");
      }
    } catch (err) {
      console.error("[payment-success] Failed to capture PayPal order:", err);
      const fallbackId = localStorage.getItem(PENDING_ORDER_KEY) ?? queryOrderId;
      if (fallbackId) setOrderId(fallbackId);
      localStorage.removeItem(PENDING_ORDER_KEY);
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "#09090C" }}>
        <div style={{ width: 40, height: 40, border: "2px solid rgba(0,112,186,0.2)", borderTopColor: "#0070BA", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p className="font-inter text-white">Confirming your payment…</p>
        <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Please wait a moment</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 px-6" style={{ background: "#09090C" }}>
        <div className="flex items-center justify-center rounded-full" style={{ width: 80, height: 80, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)" }}>
          <IoAlertCircle size={42} color="#E4A12B" />
        </div>
        <div className="text-center">
          <p className="font-playfair text-2xl font-bold text-white mb-2">Payment Received</p>
          <p className="font-cormorant text-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
            Your payment may have been processed. Check your orders for the latest status.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <button onClick={() => navigate("/orders")}
            className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
            <IoReceiptOutline size={18} />
            VIEW MY ORDERS
          </button>
          <button onClick={() => navigate("/")}
            className="w-full py-3 rounded-2xl font-inter text-sm press-active flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            <IoHome size={16} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Success icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute" style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(76,175,80,0.15) 0%, transparent 70%)" }} />
          <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "rgba(76,175,80,0.1)", border: "2px solid rgba(76,175,80,0.3)" }}>
            <IoCheckmarkCircle size={52} color="#4CAF50" />
          </div>
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Received!</p>
          <p className="font-cormorant text-xl" style={{ color: "rgba(255,255,255,0.6)" }}>
            Your order is confirmed and being prepared.
          </p>
        </div>

        {captureId && (
          <div className="w-full rounded-2xl p-4 text-center" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(76,175,80,0.15)" }}>
            <p className="font-inter text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>PayPal Transaction ID</p>
            <p className="font-inter text-sm font-bold text-white tracking-wider break-all">{captureId}</p>
          </div>
        )}

        <div className="w-full rounded-2xl p-4" style={{ background: "rgba(76,175,80,0.06)", border: "1px solid rgba(76,175,80,0.2)" }}>
          <div className="flex items-start gap-3">
            <IoCheckmarkCircle size={18} color="#4CAF50" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p className="font-inter text-sm font-semibold text-white mb-1">What happens next?</p>
              <p className="font-inter text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Your payment was successful. Our team is now packing your order for delivery. You can track your order status below.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)}
              className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
              <IoReceiptOutline size={18} />
              TRACK MY ORDER
            </button>
          )}
          <button onClick={() => navigate("/orders")}
            className="w-full py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)", color: "#E4A12B" }}>
            View All Orders
          </button>
          <button onClick={() => navigate("/")}
            className="w-full py-3 rounded-2xl font-inter text-sm press-active flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <IoHome size={15} />
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
