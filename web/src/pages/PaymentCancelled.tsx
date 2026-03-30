import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCloseCircleOutline, IoRefresh, IoChevronBack, IoHome } from "react-icons/io5";
import { supabase } from "@/lib/supabase";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_28E7sK0Hwdf643lgUGbMQ00";

export function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryOrderId = searchParams.get("orderId") ?? "";

  const [orderId, setOrderId] = useState<string>("");
  const [updating, setUpdating] = useState(true);

  useEffect(() => {
    markCancelled();
  }, []);

  const markCancelled = async () => {
    const storedId = localStorage.getItem(PENDING_ORDER_KEY) ?? "";
    const resolvedId = storedId || queryOrderId;
    setOrderId(resolvedId);

    if (resolvedId) {
      try {
        // Keep order in DB but mark payment as cancelled
        await supabase.from("orders").update({ payment_status: "cancelled" }).eq("id", resolvedId);
      } catch (err) {
        console.error("[payment-cancelled] Failed to update order:", err);
      }
    }
    // Keep the pending key so retry works without re-filling the form
    setUpdating(false);
  };

  const handleRetryPayment = () => {
    // Go back to Stripe — order ID is still in localStorage
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  if (updating) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Cancelled icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute" style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
          <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <IoCloseCircleOutline size={52} color="rgba(255,255,255,0.45)" />
          </div>
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Cancelled</p>
          <p className="font-cormorant text-xl" style={{ color: "rgba(255,255,255,0.55)" }}>
            You cancelled the payment. No charge was made.
          </p>
        </div>

        <div className="w-full rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.08)" }}>
          <p className="font-inter text-sm text-white font-semibold mb-1">Your order is saved</p>
          <p className="font-inter text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Your order details are still in our system. You can complete the payment now, go back to checkout to change your payment method, or come back later.
          </p>
          {orderId && (
            <p className="font-inter text-xs mt-3 font-semibold tracking-wide" style={{ color: "rgba(228,161,43,0.5)" }}>
              Order #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button onClick={handleRetryPayment} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C91E8C, #9B15A0)", color: "#fff" }}>
            <IoRefresh size={18} />
            COMPLETE PAYMENT
          </button>
          <button onClick={() => navigate("/checkout")} className="w-full py-3 rounded-2xl font-inter text-sm font-semibold press-active flex items-center justify-center gap-2"
            style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)", color: "#E4A12B" }}>
            <IoChevronBack size={16} />
            Back to Checkout
          </button>
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)} className="w-full py-3 rounded-2xl font-inter text-sm press-active"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              View Order Details
            </button>
          )}
          <button onClick={() => navigate("/")} className="w-full py-2 font-inter text-sm press-active"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            <IoHome size={14} style={{ display: "inline", marginRight: 4 }} />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
