import React from "react";

export function ScreenBackground({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`screen-bg min-h-full w-full ${className}`} style={{ background: "linear-gradient(160deg, #0D0B14 0%, #09090C 40%, #0A0808 100%)" }}>
      {children}
    </div>
  );
}
