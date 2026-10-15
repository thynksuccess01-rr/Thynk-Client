import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthCtx {
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({
  loading: true, profile: null, signIn: async () => null, signOut: async () => {},
});
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the profile (role + client) whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user) { setProfile(null); return; }
      const { data } = await supabase
        .from("profiles").select("id,email,role,full_name,client_id")
        .eq("id", session.user.id).single();
      if (!cancelled) { setProfile((data as Profile) ?? null); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? error.message : null;
  }
  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return <Ctx.Provider value={{ loading, profile, signIn, signOut }}>{children}</Ctx.Provider>;
}
