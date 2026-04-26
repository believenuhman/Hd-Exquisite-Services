import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  IoRefresh, IoLogOutOutline, IoDownloadOutline, IoCopyOutline,
  IoCheckmarkCircle, IoLink, IoQrCode,
} from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { AdminTabs } from "./AdminTabs";

// Premium black/gold palette so the QR matches the rest of the merchant UI
// AND the printable poster the merchant exports.
const GOLD = "#E4A12B";
const GOLD_DARK = "#9B6F1A";
const INK  = "#0A0A0F";

// QR colour scheme — INTENTIONALLY standard dark-on-light. We tried gold-on-
// black for visual flair but inverted QRs are rejected by some older Android
// scanners. Black modules on a white card guarantee scannability on every
// phone; the *poster* around the card is still premium black/gold so the
// brand identity is preserved.
const QR_DARK = INK;
const QR_LIGHT = "#FFFFFF";

// Render at 1024×1024 so a downloaded PNG looks crisp on flyers and posters
// when scaled up. The on-screen card scales it down via CSS.
const CANVAS_PX = 1024;

// Tracks viewport width once, then on resize, so we can collapse the 2-column
// preview/controls layout into a single column on phones / narrow admin
// windows. Avoids horizontal overflow that would hide the download buttons.
function useIsNarrow(breakpoint = 760): boolean {
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

export function QRCodePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isNarrow = useIsNarrow();

  // The QR can encode any URL the merchant types. Default to whatever domain
  // the admin is currently using — that's almost always the live customer
  // site, since admins access the same domain. Editable so they can point at
  // a custom domain or a campaign-specific landing path.
  const initialUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [url,  setUrl]  = useState<string>(initialUrl);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isValidUrl = useMemo(() => {
    try { new URL(url); return true; } catch { return false; }
  }, [url]);

  // Re-render the QR onto an offscreen 1024×1024 canvas any time the URL
  // changes. (SVG variants are generated on-demand inside the download
  // handlers — keeping them out of state avoids a race where a fast click
  // downloads stale or empty SVG before the async generation has resolved.)
  useEffect(() => {
    if (!isValidUrl) return;
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: CANVAS_PX,
        margin: 2,
        errorCorrectionLevel: "H", // 30% damage tolerance — survives folds, smudges, gloss
        color: { dark: QR_DARK, light: QR_LIGHT },
      }).catch((e) => console.error("[QR canvas]", e));
    }
  }, [url, isValidUrl]);

  // Build a self-contained "poster" PNG: black background, gold QR, gold
  // accent rule, and the brand text below. This is the asset the merchant
  // wants to drop straight onto a flyer or sticker — no extra editing needed.
  const downloadPoster = useCallback(async (format: "png" | "svg") => {
    if (!isValidUrl) return;

    if (format === "svg") {
      // SVG poster: build an SVG string with a wrapper that includes the
      // brand chrome around the QR vector. Vectors print at any size.
      const inner = await QRCode.toString(url, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      // Strip the outer <svg ...> tags from the QR and re-embed inside our
      // poster wrapper at a fixed coordinate. We need to know the QR's
      // intrinsic viewBox size so we can scale it to `qrSize` on the poster.
      const innerBody = inner.replace(/^<\?xml[^?]*\?>\s*/, "").replace(/<svg[^>]*>|<\/svg>/g, "");

      // Parse the QR's viewBox. The qrcode lib emits `viewBox="0 0 N N"` where
      // N is the module count (incl. quiet zone) — float-tolerant just in
      // case a future version emits decimals. Fail loudly so we don't ship a
      // poster with a tiny / misaligned QR.
      const vbMatch = inner.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      if (!vbMatch) {
        console.error("[QR svg] could not parse viewBox; aborting export.", inner.slice(0, 200));
        alert("Could not generate the SVG poster. Please try the PNG download instead.");
        return;
      }
      const [, vbW, vbH] = vbMatch;
      const intrinsic = Math.max(Number(vbW), Number(vbH)) || 1;

      const W = 1080, H = 1500;
      const qrSize = 880, qrX = (W - qrSize) / 2, qrY = 220;
      const scale = qrSize / intrinsic;
      const poster = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="${W / 2}" y="120" text-anchor="middle" fill="${GOLD}" font-family="Georgia, 'Playfair Display', serif" font-size="62" font-weight="700" letter-spacing="6">SCAN TO ORDER</text>
  <line x1="${W / 2 - 80}" y1="158" x2="${W / 2 + 80}" y2="158" stroke="url(#g)" stroke-width="3"/>
  <rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}" rx="20" ry="20" fill="${QR_LIGHT}" stroke="${GOLD}" stroke-width="4"/>
  <g transform="translate(${qrX}, ${qrY}) scale(${scale})">
    ${innerBody}
  </g>
  <text x="${W / 2}" y="${qrY + qrSize + 130}" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Playfair Display', serif" font-size="58" font-weight="700" letter-spacing="14">HD XQUISITE</text>
  <text x="${W / 2}" y="${qrY + qrSize + 200}" text-anchor="middle" fill="${GOLD}" font-family="Georgia, 'Playfair Display', serif" font-size="36" letter-spacing="22">LIQUORS</text>
  <text x="${W / 2}" y="${qrY + qrSize + 270}" text-anchor="middle" fill="#888" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="2">PREMIUM SPIRITS · DELIVERED</text>
</svg>`;
      const blob = new Blob([poster], { type: "image/svg+xml;charset=utf-8" });
      const dataUrl = URL.createObjectURL(blob);
      triggerDownload(dataUrl, "hd-xquisite-qr-poster.svg");
      setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
      return;
    }

    // PNG poster — render off-screen onto a high-res canvas.
    const W = 1080, H = 1500;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    // "SCAN TO ORDER" headline + gold accent rule
    ctx.fillStyle = GOLD;
    ctx.font = "700 62px Georgia, 'Playfair Display', serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO ORDER", W / 2, 130);
    const grad = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
    grad.addColorStop(0, GOLD); grad.addColorStop(1, GOLD_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(W / 2 - 80, 156, 160, 3);

    // QR code centered, sitting on a white card with a gold border for the
    // premium "menu QR" look. Drawn at high res into a temp canvas first.
    const qrSize = 880;
    const qrX = (W - qrSize) / 2;
    const qrY = 220;

    // White card behind the QR
    const cardPad = 24;
    ctx.fillStyle = QR_LIGHT;
    roundRect(ctx, qrX - cardPad, qrY - cardPad, qrSize + cardPad * 2, qrSize + cardPad * 2, 20);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = GOLD;
    ctx.stroke();

    const tmp = document.createElement("canvas");
    await QRCode.toCanvas(tmp, url, {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: QR_DARK, light: QR_LIGHT },
    });
    ctx.drawImage(tmp, qrX, qrY);

    // Brand block under the QR
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 58px Georgia, 'Playfair Display', serif";
    ctx.fillText("HD XQUISITE", W / 2, qrY + qrSize + 130);

    ctx.fillStyle = GOLD;
    ctx.font = "400 36px Georgia, 'Playfair Display', serif";
    ctx.fillText("L I Q U O R S", W / 2, qrY + qrSize + 200);

    ctx.fillStyle = "#888888";
    ctx.font = "400 22px Helvetica, Arial, sans-serif";
    ctx.fillText("PREMIUM SPIRITS · DELIVERED", W / 2, qrY + qrSize + 270);

    triggerDownload(c.toDataURL("image/png"), "hd-xquisite-qr-poster.png");
  }, [url, isValidUrl]);

  const downloadQrOnly = useCallback(async (format: "png" | "svg") => {
    if (!isValidUrl) return;
    if (format === "svg") {
      // Generate fresh SVG on-demand to avoid a race where the user clicks
      // before the URL change's async generation has resolved.
      const svg = await QRCode.toString(url, {
        type: "svg", margin: 2, errorCorrectionLevel: "H",
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const u = URL.createObjectURL(blob);
      triggerDownload(u, "hd-xquisite-qr.svg");
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } else {
      const dataUrl = await QRCode.toDataURL(url, {
        width: CANVAS_PX, margin: 2, errorCorrectionLevel: "H",
        color: { dark: QR_DARK, light: QR_LIGHT },
      });
      triggerDownload(dataUrl, "hd-xquisite-qr.png");
    }
  }, [url, isValidUrl]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }, [url]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(10,10,15,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(228,161,43,0.18)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "#8C8C95", letterSpacing: 1.4, textTransform: "uppercase" }}>HD Xquisite Liquors</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>QR Code</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setUrl(typeof window !== "undefined" ? window.location.origin : "")}
            title="Reset to current site URL"
            aria-label="Reset destination URL to current site"
            style={iconBtn}
          ><IoRefresh size={18} /></button>
          <button
            onClick={async () => { await signOut(); navigate("/auth/login"); }}
            title="Sign out"
            aria-label="Sign out"
            style={iconBtn}
          >
            <IoLogOutOutline size={18} />
          </button>
        </div>
      </div>
      <AdminTabs />

      <div style={{
        padding: "20px",
        display: "grid",
        gap: 20,
        // Stack into one column on narrow viewports (admin on phones / split
        // screens) so the download buttons remain reachable without horizontal
        // scrolling.
        gridTemplateColumns: isNarrow ? "1fr" : "minmax(280px, 380px) 1fr",
        alignItems: "start",
      }}>
        {/* Live preview "poster" — what the customer-facing flyer will look like */}
        <div style={{
          background: INK,
          borderRadius: 18,
          border: "1px solid rgba(228,161,43,0.32)",
          padding: 24,
          textAlign: "center",
          // Sticky preview on wide screens so it stays visible while
          // scrolling controls; on narrow screens the preview just sits
          // above the controls naturally — no sticky.
          position: isNarrow ? "static" : "sticky",
          top: 100,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: 4, fontFamily: "Georgia, 'Playfair Display', serif" }}>
            SCAN TO ORDER
          </div>
          <div style={{
            width: 60, height: 2, margin: "8px auto 18px",
            background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})`,
          }} />

          <div style={{
            background: "#FFFFFF",
            padding: 14,
            borderRadius: 12,
            border: `2px solid ${GOLD}`,
            boxShadow: `0 0 0 4px ${INK}, 0 0 0 5px rgba(228,161,43,0.5)`,
            display: "inline-block",
          }}>
            <canvas
              ref={canvasRef}
              style={{ width: 220, height: 220, display: "block" }}
            />
          </div>

          <div style={{
            marginTop: 18,
            fontSize: 18, fontWeight: 700, color: "#fff",
            letterSpacing: 6, fontFamily: "Georgia, 'Playfair Display', serif",
          }}>
            HD XQUISITE
          </div>
          <div style={{
            fontSize: 11, color: GOLD,
            letterSpacing: 8, marginTop: 2, fontFamily: "Georgia, 'Playfair Display', serif",
          }}>
            L I Q U O R S
          </div>
          <div style={{
            fontSize: 9, color: "#666", letterSpacing: 1.6, marginTop: 6, textTransform: "uppercase",
          }}>
            Premium Spirits · Delivered
          </div>

          {!isValidUrl && (
            <div style={{ marginTop: 14, fontSize: 11, color: "#FF6B7A" }}>
              Enter a valid URL on the right to generate a QR code.
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* URL input */}
          <div>
            <label style={sectionLabel}><IoLink size={13} /> Destination URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                inputMode="url"
                aria-label="QR code destination URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-site.com"
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 10,
                  background: "#0F0F14", border: `1px solid ${isValidUrl ? "rgba(255,255,255,0.1)" : "rgba(220,53,69,0.4)"}`,
                  color: "#fff", fontSize: 14, outline: "none", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              />
              <button
                onClick={copyUrl}
                title="Copy URL"
                style={{
                  padding: "0 14px", borderRadius: 10,
                  background: copied ? "rgba(54,193,83,0.16)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied ? "rgba(54,193,83,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: copied ? "#36C153" : "#D8D8DE",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                {copied ? <><IoCheckmarkCircle size={15} /> Copied</> : <><IoCopyOutline size={15} /> Copy</>}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 6, lineHeight: 1.5 }}>
              Defaults to the live site URL. Edit to point at a custom domain
              or a campaign landing page (e.g.{" "}
              <code style={codeStyle}>{initialUrl}/events</code>). The poster
              preview on the left updates instantly.
            </div>
          </div>

          {/* Download buttons — poster format (with brand chrome) */}
          <div>
            <label style={sectionLabel}><IoDownloadOutline size={13} /> Download "Scan to Order" Poster</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => downloadPoster("png")} disabled={!isValidUrl} style={primaryBtn(!isValidUrl)}>
                <IoDownloadOutline size={16} /> PNG (1080×1500)
              </button>
              <button onClick={() => downloadPoster("svg")} disabled={!isValidUrl} style={secondaryBtn(!isValidUrl)}>
                <IoDownloadOutline size={16} /> SVG (vector)
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 6, lineHeight: 1.5 }}>
              Includes "Scan to Order" headline, brand mark, and the QR — drop
              straight onto a flyer, sticker, or social post. SVG prints at
              any size without quality loss.
            </div>
          </div>

          {/* Download buttons — QR only (for users who want their own layout) */}
          <div>
            <label style={sectionLabel}><IoQrCode size={13} /> Download QR Only</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => downloadQrOnly("png")} disabled={!isValidUrl} style={secondaryBtn(!isValidUrl)}>
                <IoDownloadOutline size={16} /> PNG (1024×1024)
              </button>
              <button onClick={() => downloadQrOnly("svg")} disabled={!isValidUrl} style={secondaryBtn(!isValidUrl)}>
                <IoDownloadOutline size={16} /> SVG (vector)
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 6, lineHeight: 1.5 }}>
              Just the black-on-white QR with no text or border — useful
              when you want to compose your own poster in Canva or Photoshop.
            </div>
          </div>

          {/* Notes */}
          <div style={{
            background: "rgba(228,161,43,0.06)",
            border: "1px solid rgba(228,161,43,0.2)",
            borderRadius: 12, padding: 14, fontSize: 12, color: "#D8D8DE", lineHeight: 1.6,
          }}>
            <strong style={{ color: GOLD }}>Print tips</strong><br />
            • Keep a clear (light) margin around the QR — at least the width
            of one of the QR's outer corner squares.<br />
            • Use the SVG file when printing larger than 8" / 20cm.<br />
            • Test scan with at least two phones (iOS + Android) before
            ordering a print run.
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "24px 20px 8px", color: "#444", fontSize: 11 }}>
        Signed in as {user?.email ?? "—"}
      </div>
    </div>
  );
}

// Helper for canvas — there's no built-in roundRect on older browsers.
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#D8D8DE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
const sectionLabel: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 11, color: "#8C8C95", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600,
  marginBottom: 8,
};
const codeStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)", padding: "1px 6px", borderRadius: 4,
  fontFamily: "ui-monospace, monospace", fontSize: 11, color: GOLD,
};
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "12px 14px", borderRadius: 10, border: "none",
  background: disabled ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #D4901A, #F5C842)",
  color: disabled ? "#6E6E78" : "#0A0A0F",
  fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});
const secondaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(228,161,43,0.4)",
  color: "#E4A12B", fontSize: 13, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});
