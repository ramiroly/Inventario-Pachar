import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import styles from "../components/AuthLayout.module.css";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

/**
 * Página a la que llegan los links de invitación y de recuperación de
 * contraseña de Supabase (redirigen a Site URL con un access_token en el
 * hash; supabase-js lo detecta solo y crea la sesión). Aquí el usuario recién
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
  // Sin sesión (link vencido, ya usado, o entró directo): no hay nada que hacer.
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
    <AuthLayout
      titulo="Configura tu contraseña"
      subtitulo={
        <>
          Cuenta: <strong>{session.user.email}</strong>. Usarás esta contraseña de ahora en adelante para entrar al
          sistema.
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="nueva" className={styles.label}>
            Nueva contraseña
          </label>
          <PasswordInput id="nueva" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmar" className={styles.label}>
            Repite la contraseña
          </label>
          <PasswordInput
            id="confirmar"
            value={confirmacion}
            onChange={setConfirmacion}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthLayout>
  );
}
