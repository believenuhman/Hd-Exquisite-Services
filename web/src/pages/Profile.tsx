import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPerson, IoCreate, IoLogOut, IoLogIn, IoHome, IoCart, IoReceipt, IoClose, IoCheckmarkCircle, IoSettings, IoHelpCircle, IoSparkles } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/context/MembershipContext";
import { TIERS, deliveryCutoffLabelForTier } from "@/lib/business";
import { storage } from "@/lib/storage";

const ADDRESS_KEY = "hd_profile_address";

export function Profile() {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const { tier, membership } = useMembership();
  const isSignedIn = !!user;
  const tierCfg = TIERS[tier];
  const expires = membership?.expires_at ? new Date(membership.expires_at) : null;

  const [editMode, setEditMode] = useState(false);
  const [address, setAddress] = useState(() => storage.get(ADDRESS_KEY) ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const name = user?.user_metadata?.full_name ?? (isGuest ? "Guest" : "");
  const email = user?.email ?? "";
  const phone = user?.user_metadata?.phone ?? "";

  const handleSave = async () => {
    setSaving(true);
    storage.set(ADDRESS_KEY, address);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <p className="font-playfair text-white font-bold text-2xl">Profile</p>
        {saved && (
          <div className="flex items-center gap-1">
            <IoCheckmarkCircle size={14} color="#28A745" />
            <span className="font-inter text-xs" style={{ color: "#28A745" }}>Saved</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-4" style={{ paddingBottom: 90 }}>
        {/* Avatar block */}
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-4">
            <div className="rounded-full flex items-center justify-center" style={{ width: 88, height: 88, background: "linear-gradient(135deg, #D4901A, #F5C842)" }}>
              <IoPerson size={40} color="#09090C" />
            </div>
            {!isGuest && (
              <div className="absolute bottom-0 right-0 rounded-full flex items-center justify-center" style={{ width: 26, height: 26, background: "#C91E8C", border: "2px solid #09090C" }}>
                <IoPerson size={12} color="white" />
              </div>
            )}
          </div>
          <p className="font-playfair text-white font-bold text-xl mb-1">{name || "HD Member"}</p>
          {email ? <p className="font-inter text-sm mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>{email}</p> : null}
          <div className="px-3 py-1 rounded-full" style={{ background: isSignedIn ? tierCfg.accent + "1F" : "rgba(255,255,255,0.06)", border: `1px solid ${isSignedIn ? tierCfg.accent + "55" : "rgba(255,255,255,0.12)"}` }}>
            <span className="font-inter text-xs font-semibold" style={{ color: isSignedIn ? tierCfg.accent : "rgba(255,255,255,0.4)" }}>
              {isSignedIn ? `✦ ${tierCfg.label} Member` : "Guest"}
            </span>
          </div>
        </div>

        {/* Membership card */}
        {isSignedIn && (
          <button onClick={() => navigate("/membership")}
            className="rounded-2xl p-4 text-left press-active flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${tierCfg.accent}1A, rgba(28,24,40,0.6))`, border: `1px solid ${tierCfg.accent}40` }}>
            <div className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 44, height: 44, background: tierCfg.accent + "26", border: `1px solid ${tierCfg.accent}66` }}>
              <IoSparkles size={20} color={tierCfg.accent} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-inter text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>Membership</p>
              <p className="font-playfair text-white font-bold text-base leading-tight">{tierCfg.label}</p>
              <p className="font-inter text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {tier === "standard"
                  ? `Upgrade for later cutoff & member-only deals`
                  : `Delivery until ${deliveryCutoffLabelForTier(tier)}${expires ? ` · Renews ${expires.toLocaleDateString()}` : ""}`}
              </p>
            </div>
            <span style={{ color: tierCfg.accent, fontSize: 18 }}>›</span>
          </button>
        )}

        {/* Guest CTA */}
        {!isSignedIn && (
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(201,30,140,0.1), rgba(212,144,26,0.08))", border: "1px solid rgba(201,30,140,0.2)" }}>
            <p className="font-inter font-semibold text-white text-sm mb-1">Create a Free Account</p>
            <p className="font-cormorant text-base mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Enjoy faster checkout, order history & exclusive offers</p>
            <button onClick={() => navigate("/auth/signup")} className="w-full py-3 rounded-xl font-inter font-bold text-sm press-active"
              style={{ background: "linear-gradient(135deg, #C91E8C, #A0176D)", color: "white" }}>
              Create Account
            </button>
          </div>
        )}

        {/* Profile Info card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
            <p className="font-inter font-semibold text-sm text-white">My Profile</p>
            <button onClick={() => setEditMode((e) => !e)} className="flex items-center gap-1.5 press-active">
              {editMode ? <IoClose size={14} color="rgba(255,255,255,0.5)" /> : <IoCreate size={14} color="#E4A12B" />}
              <span className="font-inter text-xs" style={{ color: editMode ? "rgba(255,255,255,0.5)" : "#E4A12B" }}>{editMode ? "Cancel" : "Edit"}</span>
            </button>
          </div>

          <div className="px-4">
            {[
              { icon: "👤", label: "Name", value: name || "Not set", editable: false },
              { icon: "📧", label: "Email", value: email || "Not set", editable: false },
              { icon: "📞", label: "Phone", value: phone || "Not set", editable: false },
            ].map(({ icon, label, value }, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-3 py-3">
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
                    <p className="font-inter text-sm text-white truncate">{value}</p>
                  </div>
                </div>
                {i < 2 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />}
              </React.Fragment>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            {/* Address - editable */}
            <div className="py-3">
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 16, marginTop: 2 }}>📍</span>
                <div className="flex-1">
                  <p className="font-inter text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Delivery Address</p>
                  {editMode ? (
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your delivery address"
                      className="w-full rounded-xl px-3 py-2 font-inter text-sm text-white resize-none"
                      style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(228,161,43,0.25)", minHeight: 60 }} />
                  ) : (
                    <p className="font-inter text-sm" style={{ color: address ? "white" : "rgba(255,255,255,0.35)" }}>{address || "Not set"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {editMode && (
            <div className="px-4 pb-4">
              <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-xl font-inter font-bold text-sm press-active"
                style={{ background: saving ? "rgba(228,161,43,0.3)" : "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* More */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: "rgba(255,255,255,0.4)" }}>More</p>
          {[
            { icon: <IoHome size={18} color="#E4A12B" />, label: "Browse Products", action: () => navigate("/") },
            { icon: <IoCart size={18} color="#E4A12B" />, label: "My Cart", action: () => navigate("/cart") },
            { icon: <IoReceipt size={18} color="#E4A12B" />, label: "My Orders", action: () => navigate("/orders") },
            { icon: <IoSparkles size={18} color={tierCfg.accent} />, label: "Membership & Perks", action: () => navigate("/membership") },
            { icon: <IoSettings size={18} color="rgba(255,255,255,0.5)" />, label: "Settings", action: () => navigate("/settings") },
            { icon: <IoHelpCircle size={18} color="rgba(255,255,255,0.5)" />, label: "Contact Support", action: () => navigate("/contact-support") },
          ].map(({ icon, label, action }, i, arr) => (
            <React.Fragment key={label}>
              <button onClick={action} className="w-full flex items-center gap-4 px-4 py-4 press-active">
                {icon}
                <span className="font-inter text-sm text-white flex-1 text-left">{label}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>›</span>
              </button>
              {i < arr.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginLeft: 56 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Sign in / out */}
        {isSignedIn ? (
          <button onClick={async () => { await signOut(); navigate("/auth/welcome"); }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl press-active"
            style={{ background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.2)" }}>
            <IoLogOut size={18} color="#DC3545" />
            <span className="font-inter text-sm font-semibold" style={{ color: "#DC3545" }}>Sign Out</span>
          </button>
        ) : (
          <button onClick={() => navigate("/auth/welcome")}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl press-active gold-gradient">
            <IoLogIn size={18} color="#09090C" />
            <span className="font-inter text-sm font-bold" style={{ color: "#09090C" }}>Sign In</span>
          </button>
        )}

        <p className="text-center font-inter text-xs pb-2" style={{ color: "rgba(255,255,255,0.2)" }}>HD XQUISITE LIQUORS v2.0</p>
      </div>
    </div>
  );
}
