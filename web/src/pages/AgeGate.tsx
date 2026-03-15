import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgeGate } from "@/context/AgeGateContext";

export function AgeGate() {
  const { verify } = useAgeGate();
  const navigate = useNavigate();
  const [declined, setDeclined] = useState(false);

  const handleEnter = () => {
    verify();
    navigate("/auth/welcome");
  };

  const handleDecline = () => setDeclined(true);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-8"
      style={{ background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)" }}
    >
      {/* Glow rings around logo */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 200, height: 200 }}>
        {[170, 140, 112].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: size, height: size,
              borderColor: i === 0 ? "rgba(228,161,43,0.15)" : i === 1 ? "rgba(201,30,140,0.2)" : "rgba(228,161,43,0.25)",
              animation: `glowPulse${i + 1} ${3 + i * 0.5}s ease-in-out infinite ${i * 0.5}s`,
            }}
          />
        ))}
        <img src="/logo.png" alt="HD XQUISITE" style={{ width: 130, height: 130, objectFit: "contain", position: "relative", zIndex: 1 }} />
      </div>

      {!declined ? (
        <>
          <h1 className="font-playfair text-white font-black text-3xl tracking-[4px] text-center mb-1">
            HD XQUISITE
          </h1>
          <div className="flex items-center gap-3 mb-1 justify-center">
            <div style={{ height: 1, width: 32, background: "linear-gradient(to right, transparent, #E4A12B)" }} />
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E4A12B" }} />
            <div style={{ height: 1, width: 32, background: "linear-gradient(to left, transparent, #E4A12B)" }} />
          </div>
          <p className="font-cormorant tracking-[5px] text-sm mb-8 text-center" style={{ color: "#E4A12B" }}>
            LIQUORS
          </p>

          <div className="w-full max-w-xs mb-6 p-5 rounded-2xl text-center" style={{ background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.12)" }}>
            <p className="font-playfair text-white font-bold text-xl mb-2">Age Verification</p>
            <p className="font-cormorant text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
              You must be 18 years or older to enter this site. Please verify your age to continue.
            </p>
          </div>

          <button
            onClick={handleEnter}
            className="w-full max-w-xs py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active mb-3"
            style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}
          >
            I AM 18 OR OLDER — ENTER
          </button>

          <button
            onClick={handleDecline}
            className="w-full max-w-xs py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
          >
            I am under 18 — Exit
          </button>

          <p className="mt-6 font-inter text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            By entering, you confirm you are of legal drinking age in your jurisdiction
          </p>
        </>
      ) : (
        <>
          <h2 className="font-playfair text-white font-bold text-2xl text-center mb-4">Access Denied</h2>
          <p className="font-cormorant text-base text-center mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
            You must be 18 or older to access this site.
          </p>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <span style={{ fontSize: 28 }}>🔞</span>
          </div>
        </>
      )}
    </div>
  );
}
