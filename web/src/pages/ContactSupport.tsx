import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoCall, IoMail, IoChatbubble, IoChevronDown, IoChevronUp, IoTime } from "react-icons/io5";

const FAQS = [
  {
    q: "What are your delivery hours?",
    a: "We deliver 7 days a week. Check our hours card below for the current schedule.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders are delivered within 30–90 minutes depending on your location and current order volume.",
  },
  {
    q: "Do I need to show ID on delivery?",
    a: "Yes. All deliveries require a valid government-issued photo ID confirming you are 18 or older. No ID, no delivery.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "Please contact us immediately via phone or WhatsApp. Once an order is packed or out for delivery, changes may not be possible.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We currently accept cash on delivery. Card payment options are coming soon.",
  },
  {
    q: "What if my order is incorrect or damaged?",
    a: "Contact us immediately at delivery and we will resolve the issue. Photos of damaged items are helpful.",
  },
  {
    q: "Do you deliver to my area?",
    a: "We serve selected zones. If your area is not listed at checkout, we may not currently cover it. Contact us to check.",
  },
];

export function ContactSupport() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", height: "calc(56px + env(safe-area-inset-top, 0px))", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-xl">Contact & Support</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 flex flex-col gap-4" style={{ paddingBottom: 90 }}>
        {/* Hero */}
        <div className="rounded-2xl p-5 flex flex-col items-center text-center"
          style={{ background: "linear-gradient(135deg, rgba(228,161,43,0.08), rgba(201,30,140,0.05))", border: "1px solid rgba(228,161,43,0.12)" }}>
          <img src="/logo.png" alt="HD XQUISITE" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 10 }} />
          <p className="font-playfair text-white font-bold text-lg">We're here to help</p>
          <p className="font-cormorant text-base mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Reach us anytime — we aim to respond within minutes
          </p>
        </div>

        {/* Contact buttons */}
        <div className="flex flex-col gap-3">
          <a href="tel:+18001234567"
            className="flex items-center gap-4 rounded-2xl p-4 press-active"
            style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.12)", textDecoration: "none" }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: "rgba(40,167,69,0.12)", border: "1px solid rgba(40,167,69,0.25)" }}>
              <IoCall size={20} color="#28A745" />
            </div>
            <div className="flex-1">
              <p className="font-inter font-semibold text-sm text-white">Call Us</p>
              <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Tap to call our support line</p>
            </div>
            <span className="font-inter text-xs font-semibold" style={{ color: "#28A745" }}>Call →</span>
          </a>

          <a href="https://wa.me/18001234567" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl p-4 press-active"
            style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.12)", textDecoration: "none" }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)" }}>
              <IoChatbubble size={20} color="#25D366" />
            </div>
            <div className="flex-1">
              <p className="font-inter font-semibold text-sm text-white">WhatsApp</p>
              <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Quick response via WhatsApp chat</p>
            </div>
            <span className="font-inter text-xs font-semibold" style={{ color: "#25D366" }}>Chat →</span>
          </a>

          <a href="mailto:support@hdxquisite.com"
            className="flex items-center gap-4 rounded-2xl p-4 press-active"
            style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.12)", textDecoration: "none" }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)" }}>
              <IoMail size={20} color="#E4A12B" />
            </div>
            <div className="flex-1">
              <p className="font-inter font-semibold text-sm text-white">Email Support</p>
              <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>support@hdxquisite.com</p>
            </div>
            <span className="font-inter text-xs font-semibold" style={{ color: "#E4A12B" }}>Email →</span>
          </a>
        </div>

        {/* Business hours */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <IoTime size={16} color="#E4A12B" />
            <p className="font-inter font-semibold text-xs uppercase tracking-widest" style={{ color: "#E4A12B" }}>Business Hours</p>
          </div>
          {[
            { day: "Monday – Friday", hours: "10:00 AM – 10:00 PM" },
            { day: "Saturday", hours: "10:00 AM – 11:00 PM" },
            { day: "Sunday", hours: "12:00 PM – 9:00 PM" },
          ].map(({ day, hours }) => (
            <div key={day} className="flex justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="font-inter text-sm text-white">{day}</span>
              <span className="font-inter text-sm font-semibold" style={{ color: "#E4A12B" }}>{hours}</span>
            </div>
          ))}
          <p className="font-cormorant text-sm mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            Holiday hours may vary. Check back for updates.
          </p>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: "#E4A12B" }}>
            Frequently Asked Questions
          </p>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-start gap-3 px-4 py-4 press-active text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-sm text-white">{faq.q}</p>
                  {openFaq === i && (
                    <p className="font-cormorant text-base mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {faq.a}
                    </p>
                  )}
                </div>
                {openFaq === i
                  ? <IoChevronUp size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <IoChevronDown size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0, marginTop: 2 }} />
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
