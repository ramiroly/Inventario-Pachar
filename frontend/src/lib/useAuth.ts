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
  // getSession() es async y onAuthStateChange puede tardar un instante en
  // disparar; hasta que uno de los dos responda, session=null NO significa
  // "sin sesión", significa "todavía no lo sabemos". Sin este flag, el efecto
  // de abajo confundía "no hay sesión todavía" con "sesión null real" y
  // marcaba loading=false antes de tiempo (por ej. justo después de
  // verifyOtp(), mandando a SetPasswordPage de vuelta al login).
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSessionChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
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
  }, [session, sessionChecked]);

  return { session, rol, loading };
}
