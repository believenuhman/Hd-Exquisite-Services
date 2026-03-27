import React, { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { IoCard, IoLockClosed, IoChevronBack } from "react-icons/io5";

export function PaymentMock() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get("ref") ?? "";
  const successUrl = searchParams.get("success") ?? "/payment/success";
  const cancelUrl = searchParams.get("cancel") ?? "/payment/cancelled";

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      const url = new URL(successUrl, window.location.origin);
      url.searchParams.set("orderId", orderId ?? "");
      url.searchParams.set("ref", ref);
      url.searchParams.set("gateway", "mock");
      window.location.href = url.toString();
    }, 1800);
  };

  const handleCancel = () => {
    const url = new URL(cancelUrl, window.location.origin);
    url.searchParams.set("orderId", orderId ?? "");
    window.location.href = url.toString();
  };

  const handleFail = () => {
    const failUrl = new URL("/payment/failed", window.location.origin);
    failUrl.searchParams.set("orderId", orderId ?? "");
    failUrl.searchParams.set("ref", ref);
    window.location.href = failUrl.toString();
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <div className="flex items-center gap-2">
          <IoLockClosed size={16} color="#4CAF50" />
          <p className="font-inter text-white font-semibold text-base">Secure Payment</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 flex flex-col gap-5" style={{ paddingBottom: 32 }}>
        {/* Test mode banner */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl" style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)" }}>
          <span className="font-inter text-xs font-bold" style={{ color: "#E4A12B" }}>⚠ TEST MODE</span>
          <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>No real card is charged</span>
        </div>

        {/* Card visual */}
        <div className="rounded-2xl p-5 mx-auto w-full max-w-sm" style={{ background: "linear-gradient(135deg, #1C1828, #2A1A35)", border: "1px solid rgba(201,30,140,0.3)", minHeight: 140, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(201,30,140,0.08)" }} />
          <div style={{ position: "absolute", bottom: -30, left: -10, width: 120, height: 120, borderRadius: "50%", background: "rgba(228,161,43,0.05)" }} />
          <p className="font-inter text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>HD XQUISITE LIQUORS</p>
          <p className="font-inter text-lg tracking-widest text-white font-semibold" style={{ letterSpacing: "0.2em" }}>
            {cardNumber ? cardNumber.padEnd(19, "·").slice(0, 19) : "···· ····· ·····"}
          </p>
          <div className="flex justify-between mt-4">
            <div>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>CARDHOLDER</p>
              <p className="font-inter text-sm text-white">{name || "YOUR NAME"}</p>
            </div>
            <div>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>EXPIRES</p>
              <p className="font-inter text-sm text-white">{expiry || "MM/YY"}</p>
            </div>
            <div className="flex items-center">
              <IoCard size={24} color="rgba(228,161,43,0.6)" />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <div>
            <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Card Number</label>
            <input
              type="text" inputMode="numeric" value={cardNumber}
              onChange={(e) => setCardNumber(formatCard(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="w-full rounded-xl px-4 font-inter text-sm text-white tracking-widest"
              style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Expiry</label>
              <input
                type="text" inputMode="numeric" value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full rounded-xl px-4 font-inter text-sm text-white"
                style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
            </div>
            <div>
              <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>CVV</label>
              <input
                type="password" inputMode="numeric" value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••"
                className="w-full rounded-xl px-4 font-inter text-sm text-white"
                style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
            </div>
          </div>
          <div>
            <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Name on Card</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="First Last"
              className="w-full rounded-xl px-4 font-inter text-sm text-white"
              style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
          </div>
        </div>

        {/* Test helper */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-inter text-xs font-bold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>TEST CARDS</p>
          <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Use any number — this is a mock payment page</p>
          <p className="font-inter text-xs mt-1 font-mono" style={{ color: "rgba(228,161,43,0.5)" }}>4242 4242 4242 4242 · 12/34 · 123</p>
        </div>

        <button onClick={handlePay} disabled={processing} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
          style={{ background: processing ? "rgba(201,30,140,0.3)" : "linear-gradient(135deg, #C91E8C, #9B15A0)", color: "#fff" }}>
          {processing ? (
            <>
              <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Processing...
            </>
          ) : (
            <><IoLockClosed size={16} /> PAY NOW</>
          )}
        </button>

        <div className="flex gap-3">
          <button onClick={handleCancel} className="flex-1 py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            Cancel
          </button>
          <button onClick={handleFail} className="flex-1 py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.2)", color: "rgba(220,53,69,0.7)" }}>
            Simulate Failure
          </button>
        </div>
      </div>
    </div>
  );
}
