import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, AppSettings, DeliveryZone } from "@/lib/supabase";

type AppSettingsContextType = {
  settings: AppSettings | null;
  zones: DeliveryZone[];
  loading: boolean;
  formatPrice: (amount: number) => string;
  refetch: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: null,
  zones: [],
  loading: true,
  formatPrice: (a) => `$${a.toFixed(2)}`,
  refetch: () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [{ data: s }, { data: z }] = await Promise.all([
        supabase.from("settings").select("*").limit(1).single(),
        supabase.from("delivery_zones").select("*").eq("is_active", true).order("name"),
      ]);
      if (s) setSettings(s as AppSettings);
      if (z) setZones(z as DeliveryZone[]);
    } catch (e) {
      console.warn("Settings fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const formatPrice = (amount: number) => {
    const sym = settings?.currency_symbol ?? "$";
    return `${sym}${amount.toFixed(2)}`;
  };

  return (
    <AppSettingsContext.Provider value={{ settings, zones, loading, formatPrice, refetch: fetchAll }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
