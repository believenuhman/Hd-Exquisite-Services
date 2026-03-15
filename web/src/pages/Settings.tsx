import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoChevronForward, IoNotifications, IoShield, IoDocument, IoInformationCircle, IoLockClosed, IoLogOut, IoLogIn, IoMoon } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";

export function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isSignedIn = !!user;

  const [notifications, setNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promos, setPromos] = useState(false);

  const ToggleRow = ({ label, sub, value, onToggle }: { label: string; sub?: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center gap-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0">
        <p className="font-inter text-sm text-white">{label}</p>
        {sub && <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
      </div>
      <button
        onClick={onToggle}
        className="flex-shrink-0 press-active"
        style={{
          width: 44, height: 26, borderRadius: 13,
          background: value ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.12)",
          position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%",
          background: "white", transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );

  const LinkRow = ({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-4 py-4 w-full press-active" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)" }}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-inter text-sm text-white">{label}</p>
        {sub && <p className="font-inter text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
      </div>
      <IoChevronForward size={16} color="rgba(255,255,255,0.25)" />
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
      <p className="font-inter font-semibold text-xs uppercase tracking-widest px-4 pt-4 pb-1" style={{ color: "#E4A12B" }}>{title}</p>
      <div className="px-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", height: "calc(56px + env(safe-area-inset-top, 0px))", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-xl">Settings</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5" style={{ paddingBottom: 90 }}>
        <Section title="Notifications">
          <ToggleRow label="Push Notifications" sub="Receive app notifications" value={notifications} onToggle={() => setNotifications(v => !v)} />
          <ToggleRow label="Order Updates" sub="Track your order status" value={orderUpdates} onToggle={() => setOrderUpdates(v => !v)} />
          <ToggleRow label="Promotions & Deals" sub="Exclusive offers and discounts" value={promos} onToggle={() => setPromos(v => !v)} />
        </Section>

        <Section title="Appearance">
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)" }}>
              <IoMoon size={18} color="#E4A12B" />
            </div>
            <div className="flex-1">
              <p className="font-inter text-sm text-white">Dark Mode</p>
              <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Always on — premium dark experience</p>
            </div>
            <div className="px-2 py-1 rounded-full" style={{ background: "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
              <span className="font-inter text-xs font-semibold" style={{ color: "#E4A12B" }}>Active</span>
            </div>
          </div>
        </Section>

        {isSignedIn && (
          <Section title="Account">
            <LinkRow icon={<IoLockClosed size={18} color="#E4A12B" />} label="Change Password" sub="Update your account password" onClick={() => navigate("/auth/forgot-password")} />
            <div className="py-4">
              <button onClick={async () => { await signOut(); navigate("/auth/welcome"); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl press-active"
                style={{ background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.2)" }}>
                <IoLogOut size={18} color="#DC3545" />
                <span className="font-inter text-sm font-semibold" style={{ color: "#DC3545" }}>Sign Out</span>
              </button>
            </div>
          </Section>
        )}

        {!isSignedIn && (
          <Section title="Account">
            <div className="py-4">
              <button onClick={() => navigate("/auth/welcome")}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl press-active gold-gradient">
                <IoLogIn size={18} color="#09090C" />
                <span className="font-inter text-sm font-bold" style={{ color: "#09090C" }}>Sign In</span>
              </button>
            </div>
          </Section>
        )}

        <Section title="Legal">
          <LinkRow icon={<IoShield size={18} color="#E4A12B" />} label="Privacy Policy" />
          <LinkRow icon={<IoDocument size={18} color="#E4A12B" />} label="Terms of Service" />
        </Section>

        <Section title="About">
          <LinkRow icon={<IoInformationCircle size={18} color="#E4A12B" />} label="About HD XQUISITE" sub="Premium spirits delivered to your door" />
          <div className="flex items-center justify-between py-4">
            <p className="font-inter text-sm text-white">App Version</p>
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>2.0.0</span>
          </div>
        </Section>

        <p className="text-center font-inter text-xs pb-4 mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2024 HD XQUISITE LIQUORS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
