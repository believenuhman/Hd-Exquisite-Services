import React from "react";
import { NavLink } from "react-router-dom";
import { IoReceiptOutline, IoCubeOutline, IoWarningOutline, IoCheckmarkDoneOutline, IoQrCodeOutline } from "react-icons/io5";

// Sub-navigation strip shared by every admin page (Orders / Inventory / Low
// Stock / Completed / QR Code). Lives below the dashboard header. Uses
// NavLink so the active route lights up in gold.
const TABS = [
  { to: "/admin",            label: "Orders",     Icon: IoReceiptOutline,       end: true },
  { to: "/admin/inventory",  label: "Inventory",  Icon: IoCubeOutline,          end: true },
  { to: "/admin/low-stock",  label: "Low Stock",  Icon: IoWarningOutline,       end: true },
  { to: "/admin/completed",  label: "Completed",  Icon: IoCheckmarkDoneOutline, end: true },
  { to: "/admin/qr-code",    label: "QR Code",    Icon: IoQrCodeOutline,        end: true },
];

export function AdminTabs() {
  return (
    <div style={{
      display: "flex", gap: 4, padding: "8px 20px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(10,10,15,0.92)", overflowX: "auto",
    }}>
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 14px", borderRadius: "8px 8px 0 0",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            color: isActive ? "#E4A12B" : "#A8A8B0",
            borderBottom: `2px solid ${isActive ? "#E4A12B" : "transparent"}`,
            background: isActive ? "rgba(228,161,43,0.06)" : "transparent",
            whiteSpace: "nowrap",
          })}
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
