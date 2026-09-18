import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import styles from "../components/AuthLayout.module.css";
import { supabase } from "../lib/supabaseClient";

/**
 * Recuperación de contraseña por código en vez de link.
 * Un link de un solo uso puede quedar "gastado" antes de que el usuario
 * haga clic si el cliente de correo lo pre-visita para escanearlo por
 * seguridad (muy común con Gmail/Outlook). El código no tiene ese problema:
 * no hay nada que un escáner automático pueda "usar" al leerlo.
 */
export function RecoverPasswordPage() {
  const [paso, setPaso] = useState<"pedir-codigo" | "verificar-codigo">("pedir-codigo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handlePedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email);
    setEnviando(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setPaso("verificar-codigo");
  }

  async function handleVerificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: "recovery",
    });
    setEnviando(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    navigate("/set-password");
  }

  const volver = (
    <Link to="/login" className={styles.link}>
      Volver a iniciar sesión
    </Link>
  );

  if (paso === "pedir-codigo") {
    return (
      <AuthLayout
        titulo="Recuperar contraseña"
        subtitulo="Te enviaremos un código a tu correo para que puedas crear una contraseña nueva."
        pie={volver}
      >
        <form onSubmit={handlePedirCodigo} className={styles.form}>
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
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar código"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Revisa tu correo"
      subtitulo={
        <>
          Ingresa el código que enviamos a <strong>{email}</strong>.
        </>
      }
      pie={volver}
    >
      <form onSubmit={handleVerificarCodigo} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="codigo" className={styles.label}>
            Código
          </label>
          <input
            id="codigo"
            className={`${styles.input} ${styles.inputCode}`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button} disabled={enviando}>
          {enviando ? "Verificando..." : "Verificar código"}
        </button>
      </form>
    </AuthLayout>
  );
}
