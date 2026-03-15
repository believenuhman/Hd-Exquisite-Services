import React, { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 3,
  dur: 2 + Math.random() * 2,
}));

export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 800);
    const t2 = setTimeout(() => setPhase("exit"), 2400);
    const t3 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.6s ease-out" : undefined,
      }}
    >
      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.id % 2 === 0 ? "rgba(228,161,43,0.45)" : "rgba(201,30,140,0.35)",
            animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Glow rings */}
      <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
        {[190, 155, 124].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: size,
              height: size,
              borderColor: i === 0 ? "rgba(228,161,43,0.18)" : i === 1 ? "rgba(201,30,140,0.22)" : "rgba(228,161,43,0.28)",
              animation: `glowPulse${i + 1} ${3 + i * 0.5}s ease-in-out infinite ${i * 0.5}s`,
            }}
          />
        ))}
        {/* Logo */}
        <img
          src="/logo.png"
          alt="HD XQUISITE LIQUORS"
          className="animate-logo-spring relative z-10"
          style={{ width: 130, height: 130, objectFit: "contain" }}
        />
      </div>

      {/* Brand text */}
      <div className="mt-6 text-center animate-fade-up-delay">
        <p className="font-playfair text-white font-black tracking-[8px] text-2xl uppercase">
          HD XQUISITE
        </p>
        <div className="flex items-center gap-3 my-2 justify-center">
          <div style={{ height: 1, width: 40, background: "linear-gradient(to right, transparent, #E4A12B)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E4A12B" }} />
          <div style={{ height: 1, width: 40, background: "linear-gradient(to left, transparent, #E4A12B)" }} />
        </div>
        <p className="font-cormorant text-goldAccent tracking-[6px] text-base uppercase" style={{ color: "#E4A12B" }}>
          LIQUORS
        </p>
      </div>

      <p className="mt-4 font-cormorant text-xs tracking-widest animate-fade-up-delay2" style={{ color: "rgba(228,161,43,0.55)" }}>
        PREMIUM SPIRITS · DELIVERED
      </p>
    </div>
  );
}
