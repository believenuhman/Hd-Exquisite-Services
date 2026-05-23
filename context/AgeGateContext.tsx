import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AGE_KEY = "hd_xquisite_age_confirmed";

type AgeGateContextType = {
  ageConfirmed: boolean | null;
  confirm: () => Promise<void>;
  loading: boolean;
};

const AgeGateContext = createContext<AgeGateContextType>({
  ageConfirmed: null,
  confirm: async () => {},
  loading: true,
});

export function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [ageConfirmed, setAgeConfirmed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AGE_KEY).then((val) => {
      setAgeConfirmed(val === "true");
      setLoading(false);
    });
  }, []);

  const confirm = async () => {
    await AsyncStorage.setItem(AGE_KEY, "true");
    setAgeConfirmed(true);
  };

  return (
    <AgeGateContext.Provider value={{ ageConfirmed, confirm, loading }}>
      {children}
    </AgeGateContext.Provider>
  );
}

export const useAgeGate = () => useContext(AgeGateContext);
