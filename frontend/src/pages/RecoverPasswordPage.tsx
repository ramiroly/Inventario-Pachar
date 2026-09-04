import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  return (
    <div style={{ maxWidth: 320, margin: "4rem auto" }}>
      <h1>Recuperar contraseña</h1>

      {paso === "pedir-codigo" && (
        <form onSubmit={handlePedirCodigo} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p>Te vamos a enviar un código a tu correo.</p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar código"}
          </button>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
        </form>
      )}

      {paso === "verificar-codigo" && (
        <form onSubmit={handleVerificarCodigo} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p>
            Ingresa el código que llegó a <strong>{email}</strong>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
          <button type="submit" disabled={enviando}>
            {enviando ? "Verificando..." : "Verificar código"}
          </button>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
