import { createClient } from "@supabase/supabase-js";

// Placeholder con forma de URL válida: createClient() tira una excepción en
// el arranque si recibe un string vacío, y sin esto la app ni carga mientras
// no haya un proyecto Supabase real configurado.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configurados — usando placeholder. " +
      "El login no va a funcionar hasta que copies frontend/.env.example a frontend/.env y completes " +
      "con tu proyecto Supabase."
  );
}

export const supabase = createClient(supabaseUrl ?? PLACEHOLDER_URL, supabaseAnonKey ?? PLACEHOLDER_KEY);
