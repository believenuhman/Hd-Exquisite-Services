import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";

const GUEST_KEY = "hd_auth_guest_mode";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          const guestVal = storage.get(GUEST_KEY);
          if (guestVal === "true") setIsGuest(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        // On network failure, fall back to guest-mode check and unblock the app
        const guestVal = storage.get(GUEST_KEY);
        if (guestVal === "true") setIsGuest(true);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session) { setIsGuest(false); storage.remove(GUEST_KEY); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    storage.remove(GUEST_KEY);
    setIsGuest(false);
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error.message };
    storage.remove(GUEST_KEY);
    setIsGuest(false);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    storage.remove(GUEST_KEY);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    storage.set(GUEST_KEY, "true");
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ user, session, isGuest, loading, signIn, signUp, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
