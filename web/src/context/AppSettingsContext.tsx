import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { supabase, AppSettings } from "@/lib/supabase";

type AppSettingsContextType = {
  settings: AppSettings | null;
  loading: boolean;
};

const AppSettingsContext = createContext<AppSettingsContextType>({ settings: null, loading: true });

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (!mounted) return;
        if (data) setSettings(data as AppSettings);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
