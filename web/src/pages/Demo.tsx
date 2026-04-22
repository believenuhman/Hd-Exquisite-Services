import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { PhoneMockup } from "@/components/PhoneMockup";

export function Demo() {
  const navigate = useNavigate();

  // Safety: if this page is itself loaded inside an iframe, redirect to home
  // to avoid recursive nesting (phone-inside-phone).
  useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.location.replace("/");
    }
  }, []);

  // Responsive phone width: smaller on narrow screens
  const [width, setWidth] = React.useState(320);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 380) setWidth(260);
      else if (w < 640) setWidth(290);
      else setWidth(320);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ background: "#09090C" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center px-4 gap-3"
        style={{
          height: 56,
          background: "rgba(9,9,12,0.95)",
          borderBottom: "1px solid rgba(228,161,43,0.08)",
          backdropFilter: "blur(12px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-xl press-active"
          style={{
            width: 40,
            height: 40,
            background: "rgba(228,161,43,0.07)",
            border: "1px solid rgba(228,161,43,0.12)",
          }}
        >
          <IoChevronBack size={22} color="#E4A12B" />
        </button>
        <p className="flex-1 text-center font-playfair text-white font-bold text-base">
          App Preview
        </p>
        <div style={{ width: 40 }} />
      </div>

      {/* Hero copy */}
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-8">
        <p
          className="font-cormorant tracking-[5px] text-xs mb-2"
          style={{ color: "rgba(228,161,43,0.7)" }}
        >
          PREMIUM SPIRITS · DELIVERED
        </p>
        <h1
          className="font-playfair text-white font-bold mb-3"
          style={{ fontSize: 32, lineHeight: 1.15 }}
        >
          Try the App, Live
        </h1>
        <p
          className="font-inter text-sm max-w-md"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Browse, tap, and scroll through HD Xquisite Liquors right inside this
          phone — no install required.
        </p>
      </div>

      {/* Phone */}
      <div className="flex justify-center px-4 pb-16">
        <PhoneMockup
          src="https://xquisite-liquors.replit.app"
          fallbackImage="/app-preview.png"
          width={width}
        />
      </div>
    </div>
  );
}
