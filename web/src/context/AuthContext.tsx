import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";

const GUEST_KEY = "hd_auth_guest_mode";
const RECOVERY_KEY = "hd_auth_recovery_mode";

const PII_KEYS = [
  "hd_saved_name",
  "hd_saved_phone",
  "hd_saved_address",
  "hd_profile_address",
];

function setRecoveryFlag() {
  try { sessionStorage.setItem(RECOVERY_KEY, "true"); } catch {}
}
function clearRecoveryFlag() {
  try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
}
function readRecoveryFlag(): boolean {
  try { return sessionStorage.getItem(RECOVERY_KEY) === "true"; } catch { return false; }
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isRecoveryMode: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          clearRecoveryFlag();
          const guestVal = storage.get(GUEST_KEY);
          if (guestVal === "true") setIsGuest(true);
        } else {
          // Restore recovery mode after a page reload mid-flow.
          if (readRecoveryFlag()) setIsRecoveryMode(true);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        // Isolate recovery sessions — do not grant normal app access.
        // Store the session so updateUser() works, but flag recovery mode via
        // both state and sessionStorage (survives page reloads within the tab).
        setSession(session);
        setUser(session?.user ?? null);
        setRecoveryFlag();
        setIsRecoveryMode(true);
        return;
      }
      // Only SIGNED_IN and SIGNED_OUT explicitly end recovery mode.
      // TOKEN_REFRESHED / USER_UPDATED / other events must not clear it so that
      // auto-refresh does not unexpectedly restore normal access mid-reset flow.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        clearRecoveryFlag();
        setIsRecoveryMode(false);
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session) { setIsGuest(false); storage.remove(GUEST_KEY); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    storage.remove(GUEST_KEY);
    setIsGuest(false);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error.message };
    storage.remove(GUEST_KEY);
    setIsGuest(false);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    storage.remove(GUEST_KEY);
    PII_KEYS.forEach((key) => storage.remove(key));
    clearRecoveryFlag();
    setIsGuest(false);
    setIsRecoveryMode(false);
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    clearRecoveryFlag();
    setIsRecoveryMode(false);
    return { error: null };
  }, []);

  const continueAsGuest = useCallback(() => {
    storage.set(GUEST_KEY, "true");
    setIsGuest(true);
  }, []);

  const value = useMemo(() => ({
    user, session, isGuest, isRecoveryMode, loading, signIn, signUp, signOut, continueAsGuest, changePassword,
  }), [user, session, isGuest, isRecoveryMode, loading, signIn, signUp, signOut, continueAsGuest, changePassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
