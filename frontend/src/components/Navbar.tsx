import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabaseClient";

export function Navbar() {
  const { session, rol } = useAuth();
  if (!session) return null;

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
      <NavLink to="/">Stock</NavLink>
      <NavLink to="/comparativo">Comparativo</NavLink>
      <NavLink to="/liquidos">Líquidos</NavLink>
      {rol === "admin" && <NavLink to="/movimientos/nuevo">Cargar movimiento</NavLink>}
      <span style={{ marginLeft: "auto" }}>
        {session.user.email} ({rol ?? "sin rol"})
      </span>
      <button onClick={() => supabase.auth.signOut()}>Salir</button>
    </nav>
  );
}
