import { useEffect, useState } from "react";
import { mensajeError } from "../lib/errores";
import styles from "./AnularDialog.module.css";

interface Props {
  resumen: string[];
  onConfirmar: (motivo: string) => Promise<void>;
  onCancelar: () => void;
}

// Ventana para anular un movimiento: muestra qué se va a anular y pide el motivo.
export function AnularDialog({ resumen, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onCancelar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [enviando, onCancelar]);

  async function confirmar() {
    setError(null);
    setEnviando(true);
    try {
      await onConfirmar(motivo.trim());
    } catch (e) {
      setError(mensajeError(e));
      setEnviando(false);
    }
  }

  return (
    <div className={styles.fondo} onMouseDown={(e) => e.target === e.currentTarget && !enviando && onCancelar()}>
      <div className={styles.dialogo} role="dialog" aria-modal="true" aria-labelledby="anular-titulo">
        <h2 id="anular-titulo" className={styles.titulo}>
          Anular movimiento
        </h2>
        <div className={styles.resumen}>
          {resumen.map((linea) => (
            <p key={linea}>{linea}</p>
          ))}
        </div>
        <p className={styles.aviso}>
          No se borra: queda en el registro como anulado y deja de contar en el stock, los saldos y los dashboards.
        </p>
        <label className={styles.label} htmlFor="motivo-anulacion">
          Motivo de la anulación
        </label>
        <input
          id="motivo-anulacion"
          className={styles.input}
          type="text"
          maxLength={200}
          autoFocus
          autoComplete="off"
          placeholder="Ej. número de lote mal escrito"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && motivo.trim().length >= 3 && !enviando && confirmar()}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.botones}>
          <button type="button" className={styles.cancelar} disabled={enviando} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={styles.anular} disabled={enviando || motivo.trim().length < 3} onClick={confirmar}>
            {enviando ? "Anulando..." : "Anular movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
