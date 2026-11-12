"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "../lib/supabase-browser";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  db: SupabaseClient | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  configured: false,
  db: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [db] = useState<SupabaseClient | null>(() => supabaseBrowser());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!supabaseBrowser());

  useEffect(() => {
    if (!db) return;
    let alive = true;
    db.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [db]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: !!db,
      db,
      signOut: async () => {
        await db?.auth.signOut();
      },
    }),
    [session, loading, db],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
