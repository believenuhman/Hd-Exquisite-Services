import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api";
import type { MembershipTier } from "@/lib/business";

export type MembershipRow = {
  user_id:            string;
  tier:               MembershipTier;
  status:             "pending_payment" | "active" | "expired" | "cancelled";
  started_at:         string | null;
  expires_at:         string | null;
  payment_reference:  string | null;
  paypal_order_id:    string | null;
  amount_paid:        number | null;
  currency_code:      string | null;
};

type Ctx = {
  tier:        MembershipTier;          // effective tier (always defined)
  membership:  MembershipRow | null;    // raw row or null
  loading:     boolean;
  refresh:     () => Promise<void>;
};

const MembershipContext = createContext<Ctx>({ tier: "standard", membership: null, loading: false, refresh: async () => {} });

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<MembershipTier>("standard");
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setTier("standard");
      setMembership(null);
      return;
    }
    setLoading(true);
    try {
      // Server derives identity from the Supabase JWT; we no longer pass user_id.
      const r = await authedFetch(`/api/memberships/me`);
      const data = await r.json() as { tier?: MembershipTier; membership?: MembershipRow | null };
      setTier(data.tier ?? "standard");
      setMembership(data.membership ?? null);
    } catch {
      setTier("standard");
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ tier, membership, loading, refresh }), [tier, membership, loading, refresh]);
  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() { return useContext(MembershipContext); }
