import React, { createContext, useContext, useState, ReactNode } from "react";
import { storage } from "@/lib/storage";

const AGE_KEY = "hd_age_verified";

type AgeGateContextType = {
  verified: boolean;
  verify: () => void;
};

const AgeGateContext = createContext<AgeGateContextType | null>(null);

export function AgeGateProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState<boolean>(() => storage.get(AGE_KEY) === "true");

  const verify = () => {
    storage.set(AGE_KEY, "true");
    setVerified(true);
  };

  return <AgeGateContext.Provider value={{ verified, verify }}>{children}</AgeGateContext.Provider>;
}

export function useAgeGate() {
  const ctx = useContext(AgeGateContext);
  if (!ctx) throw new Error("useAgeGate must be used within AgeGateProvider");
  return ctx;
}
