import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoCheckmarkCircle, IoSparkles, IoLockClosed, IoAlertCircle } from "react-icons/io5";
import { TIERS, TIER_RANK, type MembershipTier, deliveryCutoffLabelForTier } from "@/lib/business";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/context/MembershipContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { authedFetch } from "@/lib/api";

const PENDING_MEMBERSHIP_KEY = "hd_pending_membership_paypal_id";

export function Membership() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { tier: currentTier, membership, refresh } = useMembership();
  const { settings } = useAppSettings();
  const sym = settings?.currency_symbol ?? "$";

  const [busyTier, setBusyTier] = useState<MembershipTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expires = membership?.expires_at ? new Date(membership.expires_at) : null;

  const handleSubscribe = async (tier: MembershipTier) => {
    setError(null);
    if (!user?.id) {
      navigate("/auth/welcome");
      return;
    }
    setBusyTier(tier);
    try {
      const r = await authedFetch("/api/memberships/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, origin: window.location.origin }),
      });
      const data = await r.json() as { approvalUrl?: string; paypalOrderId?: string; error?: string };
      if (!r.ok || !data.approvalUrl) throw new Error(data.error ?? "Could not start subscription.");
      if (data.paypalOrderId) localStorage.setItem(PENDING_MEMBERSHIP_KEY, data.paypalOrderId);
      window.location.href = data.approvalUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start subscription.");
      setBusyTier(null);
    }
  };

  const tierList: MembershipTier[] = ["standard", "gold", "platinum"];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <div className="flex flex-col">
          <p className="font-playfair text-white font-bold text-xl leading-tight">Membership</p>
          <p className="font-cormorant text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Premium tiers, member perks</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 flex flex-col gap-5" style={{ paddingBottom: 100 }}>
        {/* Current tier callout */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(228,161,43,0.08), rgba(28,24,40,0.6))", border: "1px solid rgba(228,161,43,0.18)" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 48, height: 48, background: TIERS[currentTier].accent + "26", border: `1px solid ${TIERS[currentTier].accent}55` }}>
            <IoSparkles size={22} color={TIERS[currentTier].accent} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-inter text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>Your tier</p>
            <p className="font-playfair text-white text-lg font-bold leading-tight">{TIERS[currentTier].label}</p>
            {expires && (
              <p className="font-inter text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                Renews {expires.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <IoAlertCircle size={16} color="#DC3545" />
            <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
          </div>
        )}

        {(isGuest || !user) && (
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.18)" }}>
            <IoLockClosed size={14} color="#E4A12B" style={{ marginTop: 2 }} />
            <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              <span className="text-white font-semibold">Create an account</span> to subscribe to Gold or Platinum and unlock member perks.
            </p>
          </div>
        )}

        {/* Tier cards */}
        {tierList.map((key) => {
          const cfg = TIERS[key];
          const isCurrent = currentTier === key;
          const isLower   = TIER_RANK[key] < TIER_RANK[currentTier];
          const cta = isCurrent ? "Current Plan" : isLower ? "Included" : key === "standard" ? "Free" : `Subscribe — ${sym}${cfg.monthlyPrice.toFixed(2)}/mo`;
          const ctaDisabled = isCurrent || isLower || key === "standard";
          return (
            <div key={key} className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                background: isCurrent
                  ? `linear-gradient(135deg, ${cfg.accent}1F, rgba(28,24,40,0.6))`
                  : "linear-gradient(145deg, #1C1828, #121212)",
                border: `1px solid ${isCurrent ? cfg.accent + "66" : "rgba(228,161,43,0.1)"}`,
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-playfair text-white text-xl font-bold">{cfg.label}</p>
                    {isCurrent && (
                      <span className="font-inter text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.accent + "26", color: cfg.accent, border: `1px solid ${cfg.accent}55` }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="font-cormorant text-base" style={{ color: "rgba(255,255,255,0.55)" }}>{cfg.tagline}</p>
                </div>
                <div className="text-right">
                  {cfg.monthlyPrice > 0 ? (
                    <>
                      <p className="font-playfair text-white font-bold text-2xl leading-tight">{sym}{cfg.monthlyPrice.toFixed(2)}</p>
                      <p className="font-inter text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>per 30 days</p>
                    </>
                  ) : (
                    <p className="font-inter text-sm font-semibold" style={{ color: cfg.accent }}>Free</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="font-inter text-[11px] uppercase tracking-widest" style={{ color: cfg.accent }}>Cutoff</span>
                <span className="font-inter text-sm font-semibold text-white">{deliveryCutoffLabelForTier(key)}</span>
              </div>

              <ul className="flex flex-col gap-2 mt-1">
                {cfg.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <IoCheckmarkCircle size={15} color={cfg.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{perk}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(key)}
                disabled={ctaDisabled || busyTier !== null}
                className="mt-2 w-full py-3 rounded-xl font-inter font-bold text-sm press-active"
                style={{
                  background: ctaDisabled
                    ? "rgba(255,255,255,0.04)"
                    : `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}CC)`,
                  color: ctaDisabled ? "rgba(255,255,255,0.4)" : "#09090C",
                  border: ctaDisabled ? "1px solid rgba(255,255,255,0.06)" : "none",
                  cursor: ctaDisabled ? "default" : "pointer",
                  opacity: busyTier && busyTier !== key ? 0.5 : 1,
                }}>
                {busyTier === key ? "Connecting to PayPal…" : cta}
              </button>
            </div>
          );
        })}

        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="font-inter text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Memberships are billed once per 30 days via PayPal. You can let it lapse to return to Standard at any time — there are no contracts. Membership perks apply to all orders placed during the active period.
          </p>
        </div>
      </div>
    </div>
  );
}
