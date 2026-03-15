import React from "react";

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "gold" | "outline" | "magenta";
  icon?: React.ReactNode;
  className?: string;
}

export function GoldButton({ label, onClick, disabled, loading, variant = "gold", icon, className = "" }: Props) {
  const base = "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-inter font-bold text-sm tracking-wide press-active transition-all";

  const styles: Record<string, React.CSSProperties> = {
    gold: { background: disabled ? "rgba(228,161,43,0.3)" : "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" },
    outline: { background: "transparent", border: "1px solid rgba(228,161,43,0.35)", color: "#E4A12B" },
    magenta: { background: disabled ? "rgba(201,30,140,0.3)" : "linear-gradient(135deg, #C91E8C, #A0176D)", color: "white" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${className}`}
      style={{ ...styles[variant], opacity: disabled ? 0.7 : 1 }}
    >
      {loading ? (
        <div style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#09090C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
