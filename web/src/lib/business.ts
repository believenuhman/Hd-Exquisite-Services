// Single source of truth for business rules used across the storefront.
// Keep all hardcoded business policy here so changes flow through everywhere.

// Delivery cutoff — orders for same-day DELIVERY must be placed before this time.
// Pickup orders are always allowed (limited by store hours, not by this cutoff).
// 24-hour clock; uses the customer's local browser time.
export const DELIVERY_CUTOFF_HOUR   = 20; // 8 PM
export const DELIVERY_CUTOFF_MINUTE = 30; // :30  ->  8:30 PM

// Pickup location — change here to update everywhere.
export const PICKUP_LOCATION = "Barbershop, James Fort Building, Bridgetown";

export function deliveryCutoffLabel(): string {
  const h12 = ((DELIVERY_CUTOFF_HOUR + 11) % 12) + 1;
  const ampm = DELIVERY_CUTOFF_HOUR >= 12 ? "PM" : "AM";
  const mm = DELIVERY_CUTOFF_MINUTE.toString().padStart(2, "0");
  return `${h12}:${mm} ${ampm}`;
}

// True when same-day delivery is still accepted (now is before today's cutoff).
export function isDeliveryAvailableNow(now: Date = new Date()): boolean {
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < DELIVERY_CUTOFF_HOUR) return true;
  if (h > DELIVERY_CUTOFF_HOUR) return false;
  return m < DELIVERY_CUTOFF_MINUTE;
}
