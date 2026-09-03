import { createClient } from "@supabase/supabase-js";

// Placeholder con forma de URL válida: createClient() tira una excepción en
// el arranque si recibe un string vacío, y sin esto el server ni levanta
// mientras no haya un proyecto Supabase real configurado.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-service-role-key";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[supabaseClient] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados — usando placeholder. " +
      "Las rutas que consultan la base de datos van a fallar hasta que copies backend/.env.example a " +
      "backend/.env y completes con tu proyecto Supabase."
  );
}

// Cliente con service role: solo se usa en el backend (nunca se expone al frontend).
// El backend confía en su propia validación de rol (requireRole.ts) en vez de RLS
// para las rutas admin, ya que corre con la service role key.
export const supabase = createClient(supabaseUrl ?? PLACEHOLDER_URL, supabaseServiceRoleKey ?? PLACEHOLDER_KEY);
