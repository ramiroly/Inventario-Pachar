import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import styles from "../components/AuthLayout.module.css";
import { supabase } from "../lib/supabaseClient";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setEnviando(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/");
  }

  return (
    <AuthLayout
      titulo="Inventario Pachar"
      subtitulo="Ingresa con tu cuenta para continuar."
      pie={
        <Link to="/recuperar" className={styles.link}>
          ¿Olvidaste tu contraseña?
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Correo electrónico
          </label>
          <input
            id="email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Contraseña
          </label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button} disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </AuthLayout>
  );
}
