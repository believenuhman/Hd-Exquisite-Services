import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCloseCircle, IoCart, IoHome } from "react-icons/io5";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";

export function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paypalToken = searchParams.get("token")  ?? "";
  const reason      = searchParams.get("reason") ?? "";

  const [orderId, setOrderId]   = useState<string>("");
  const [updating, setUpdating] = useState(true);

  useEffect(() => { markFailed(); }, []);

  const markFailed = async () => {
    const storedId = localStorage.getItem(PENDING_ORDER_KEY) ?? "";
    if (storedId) setOrderId(storedId);

    // Only the PayPal token authorizes marking the bound order as failed.
    if (paypalToken) {
      try {
        await fetch("/api/paypal/fail-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: paypalToken }),
        });
      } catch (err) {
        console.error("[payment-failed] Could not notify backend:", err);
      }
    }
    localStorage.removeItem(PENDING_ORDER_KEY);
    setUpdating(false);
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

        <div className="relative flex items-center justify-center">
          <div className="absolute" style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(220,53,69,0.12) 0%, transparent 70%)" }} />
          <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "rgba(220,53,69,0.08)", border: "2px solid rgba(220,53,69,0.25)" }}>
            <IoCloseCircle size={52} color="#DC3545" />
          </div>
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Failed</p>
          <p className="font-cormorant text-xl" style={{ color: "rgba(255,255,255,0.55)" }}>
            We couldn't process your payment. No charge was made.
          </p>
        </div>

        <div className="w-full rounded-2xl p-4" style={{ background: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.2)" }}>
          <p className="font-inter text-sm text-white font-semibold mb-1">Your order is saved</p>
          <p className="font-inter text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Don't worry — your order details are saved. Go back to checkout to try again or choose Cash on Delivery.
          </p>
          {reason && (
            <p className="font-inter text-xs mt-2" style={{ color: "rgba(220,53,69,0.6)" }}>
              Reason: {decodeURIComponent(reason)}
            </p>
          )}
          {orderId && (
            <p className="font-inter text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              Order #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button onClick={() => navigate("/checkout")}
            className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
            <IoCart size={18} />
            BACK TO CHECKOUT
          </button>
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)}
              className="w-full py-3 rounded-2xl font-inter text-sm press-active"
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
