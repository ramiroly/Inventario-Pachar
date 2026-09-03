import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { Rol } from "../types/models";

interface AuthState {
  session: Session | null;
  rol: Rol | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setRol(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("perfiles")
      .select("rol")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setRol((data?.rol as Rol) ?? null);
        setLoading(false);
      });
  }, [session]);

  return { session, rol, loading };
}
