import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", background: "#09090C",
            padding: 24, gap: 16,
          }}
        >
          <img src="/logo.png" alt="HD XQUISITE" style={{ width: 80, height: 80, objectFit: "contain", opacity: 0.7 }} />
          <p style={{ fontFamily: "sans-serif", color: "#E4A12B", fontSize: 20, fontWeight: 700, textAlign: "center" }}>
            Something went wrong
          </p>
          <p style={{ fontFamily: "sans-serif", color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", maxWidth: 300 }}>
            {this.state.message || "An unexpected error occurred. Please refresh the page."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "12px 32px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C",
              fontFamily: "sans-serif", fontWeight: 700, fontSize: 14,
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
