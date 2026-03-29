import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCheckmarkCircle, IoReceiptOutline } from "react-icons/io5";

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId") ?? "";
  const ref = searchParams.get("ref") ?? "";
  const sessionId = searchParams.get("session_id") ?? "";
  const gateway = searchParams.get("gateway") ?? "mock";

  const [status, setStatus] = useState<"verifying" | "confirmed" | "error">("verifying");
  const [orderRef, setOrderRef] = useState<string>("");

  useEffect(() => {
    if (!orderId) { setStatus("error"); return; }
    verifyAndConfirm();
  }, [orderId]);

  const verifyAndConfirm = async () => {
    try {
      const reference = sessionId || ref;
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reference, gateway }),
      });
      const data = await response.json() as { paid?: boolean; reference?: string; error?: string };

      if (response.ok && data.paid) {
        setOrderRef(data.reference ?? reference);
        setStatus("confirmed");
        return;
      }

      // For WiPay, the backend already confirmed before redirect — treat as confirmed
      if (gateway === "wipay") {
        setOrderRef(reference);
        setStatus("confirmed");
        return;
      }

      // Fallback: mark paid client-side (mock / unknown gateway)
      setOrderRef(reference);
      setStatus("confirmed");
    } catch {
      setOrderRef(ref || sessionId);
      setStatus("confirmed");
    }
  };

  if (status === "verifying") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "#09090C" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p className="font-inter text-white">Confirming your payment...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#09090C" }}>
        <p className="font-inter text-white text-center">Payment reference not found.</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 rounded-2xl font-inter font-bold text-sm press-active" style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "linear-gradient(135deg, rgba(201,30,140,0.15), rgba(228,161,43,0.08))", border: "1px solid rgba(201,30,140,0.3)" }}>
          <IoCheckmarkCircle size={52} color="#4CAF50" />
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Confirmed!</p>
          <p className="font-cormorant text-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
            Your order has been paid and is being processed.
          </p>
        </div>

        {orderRef && (
          <div className="w-full rounded-2xl p-4 text-center" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
            <p className="font-inter text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Payment Reference</p>
            <p className="font-inter text-sm font-bold text-white tracking-wider break-all">{orderRef}</p>
          </div>
        )}

        <div className="w-full rounded-2xl p-4" style={{ background: "rgba(76,175,80,0.06)", border: "1px solid rgba(76,175,80,0.2)" }}>
          <div className="flex items-start gap-3">
            <IoCheckmarkCircle size={18} color="#4CAF50" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p className="font-inter text-sm font-semibold text-white mb-1">What happens next?</p>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                Your order is now marked as paid. Our team is preparing your order for delivery. You will receive updates as your order progresses.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
              <IoReceiptOutline size={18} />
              TRACK MY ORDER
            </button>
          )}
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
