import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
    supabase
      .from("settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as AppSettings);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return <AppSettingsContext.Provider value={{ settings, loading }}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
