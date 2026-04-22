import React, { useEffect, useRef, useState } from "react";

type TabKey = "home" | "cart" | "profile";

interface TabDef {
  key: TabKey;
  label: string;
  path: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: "home", label: "Home", path: "/", icon: "🏠" },
  { key: "cart", label: "Cart", path: "/cart", icon: "🛒" },
  { key: "profile", label: "Profile", path: "/profile", icon: "👤" },
];

interface Props {
  /** Base URL of the live app to embed. */
  src?: string;
  /** Path to a static fallback screenshot served from /public. */
  fallbackImage?: string;
  /** Fixed width of the phone frame in pixels (height auto-derived from aspect ratio). */
  width?: number;
}

export function PhoneMockup({
  src = "https://xquisite-liquors.replit.app",
  fallbackImage = "/app-preview.png",
  width = 320,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [iframeFailed, setIframeFailed] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<number | null>(null);

  // iPhone-ish 19.5:9 aspect ratio
  const height = Math.round(width * (19.5 / 9));

  const buildUrl = (path: string) => {
    const sep = src.includes("?") ? "&" : "?";
    return `${src.replace(/\/$/, "")}${path}${sep}embed=1`;
  };

  // Detect iframe load failure (X-Frame-Options, network error, etc.)
  useEffect(() => {
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    setIframeReady(false);
    setIframeFailed(false);
    loadTimerRef.current = window.setTimeout(() => {
      if (!iframeReady) setIframeFailed(true);
    }, 8000);
    return () => {
      if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, src]);

  const handleTab = (tab: TabDef) => {
    setActiveTab(tab.key);
    // Force iframe reload to the new path
    if (iframeRef.current) {
      iframeRef.current.src = buildUrl(tab.path);
    }
  };

  const onLoad = () => {
    setIframeReady(true);
    setIframeFailed(false);
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
  };

  const onError = () => setIframeFailed(true);

  return (
    <div className="flex flex-col items-center" style={{ width: "100%" }}>
      {/* Tab buttons */}
      <div
        className="flex gap-2 mb-4 p-1 rounded-full"
        style={{
          background: "rgba(228,161,43,0.08)",
          border: "1px solid rgba(228,161,43,0.18)",
        }}
      >
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => handleTab(t)}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-inter text-sm font-medium transition-all press-active"
              style={{
                background: active
                  ? "linear-gradient(135deg, #D4901A, #F5C842)"
                  : "transparent",
                color: active ? "#09090C" : "rgba(255,255,255,0.7)",
                fontWeight: active ? 600 : 500,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Phone frame */}
      <div
        className="relative"
        style={{
          width,
          height,
          padding: 12,
          borderRadius: 48,
          background:
            "linear-gradient(160deg, #2a2014 0%, #0a0a0d 45%, #1c1308 100%)",
          boxShadow: [
            "0 0 0 2px rgba(228,161,43,0.55)",
            "0 0 0 4px rgba(0,0,0,0.6)",
            "0 0 60px rgba(228,161,43,0.35)",
            "0 30px 60px rgba(0,0,0,0.7)",
            "inset 0 0 0 1px rgba(255,215,140,0.2)",
          ].join(", "),
        }}
      >
        {/* Inner bezel */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 38,
            background: "#000",
            boxShadow: "inset 0 0 0 2px rgba(0,0,0,1)",
          }}
        >
          {/* Notch */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
            style={{
              top: 8,
              width: 90,
              height: 22,
              borderRadius: 14,
              background: "#000",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#1a1a1a",
                marginRight: 8,
              }}
            />
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#0a0a0a",
                border: "1px solid rgba(228,161,43,0.25)",
              }}
            />
          </div>

          {/* Live app iframe */}
          {!iframeFailed && (
            <iframe
              ref={iframeRef}
              src={buildUrl(TABS.find((t) => t.key === activeTab)!.path)}
              title="HD Xquisite Liquors live preview"
              onLoad={onLoad}
              onError={onError}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                background: "#09090C",
              }}
            />
          )}

          {/* Loading overlay */}
          {!iframeReady && !iframeFailed && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              style={{ background: "#09090C" }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "2px solid rgba(228,161,43,0.2)",
                  borderTopColor: "#E4A12B",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p
                className="font-inter text-xs mt-3"
                style={{ color: "rgba(228,161,43,0.7)" }}
              >
                Loading live preview…
              </p>
            </div>
          )}

          {/* Fallback image */}
          {iframeFailed && (
            <div className="absolute inset-0 flex flex-col z-10">
              <img
                src={fallbackImage}
                alt="HD Xquisite Liquors app preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 p-3 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(9,9,12,0.95) 70%)",
                }}
              >
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-full font-inter text-xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #D4901A, #F5C842)",
                    color: "#09090C",
                  }}
                >
                  Open Live App ↗
                </a>
              </div>
            </div>
          )}

          {/* Home indicator */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{
              bottom: 6,
              width: 110,
              height: 4,
              borderRadius: 3,
              background: "rgba(255,255,255,0.55)",
            }}
          />
        </div>
      </div>

      {/* Caption */}
      <p
        className="font-cormorant text-sm mt-4 tracking-[2px] text-center"
        style={{ color: "rgba(228,161,43,0.65)" }}
      >
        LIVE INTERACTIVE PREVIEW · TAP TO EXPLORE
      </p>
    </div>
  );
}
