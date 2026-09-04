import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

/**
 * Página a la que llegan los links de invitación y de recuperación de
 * contraseña de Supabase (redirigen a Site URL con un access_token en el
 * hash; supabase-js lo detecta solo y crea la sesión). Acá el usuario recién
 * confirmado/recuperado define su contraseña con supabase.auth.updateUser.
 */
export function SetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (loading) return <p>Cargando...</p>;
  // Sin sesión (link vencido, ya usado, o entraste acá directo): no hay nada que hacer.
  if (!session) return <Navigate to="/login" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate("/");
  }

  return (
    <div style={{ maxWidth: 320, margin: "4rem auto" }}>
      <h1>Configurá tu contraseña</h1>
      <p>
        Sesión: {session.user.email}. Esta contraseña la vas a usar de acá en adelante para
        entrar al sistema.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          type="password"
          placeholder="Repetí la contraseña"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar contraseña"}
        </button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    </div>
  );
}
