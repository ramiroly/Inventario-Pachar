import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[supabaseClient] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados. " +
      "Copiá backend/.env.example a backend/.env y completá con tu proyecto Supabase."
  );
}

// Cliente con service role: solo se usa en el backend (nunca se expone al frontend).
// El backend confía en su propia validación de rol (requireRole.ts) en vez de RLS
// para las rutas admin, ya que corre con la service role key.
export const supabase = createClient(supabaseUrl ?? "", supabaseServiceRoleKey ?? "");
