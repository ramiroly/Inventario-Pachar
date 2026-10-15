import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ReporteStock } from "../components/ReporteStock";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { descargarExcel, fechaHoraLima, type CorteStockPublico } from "../lib/reporteStock";
import styles from "./stockActual.module.css";

// Pagina de un corte guardado: se abre con el link secreto, sin iniciar sesion.
export function CorteStockPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const [corte, setCorte] = useState<CorteStockPublico | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    api
      .get<CorteStockPublico>(`/publico/corte-stock/${token}`)
      .then(setCorte)
      .catch((e) => setError(mensajeError(e)));
  }, [token]);

  const titulo = corte ? `Stock de productos terminados — corte al ${fechaHoraLima(corte.created_at)}` : "";

  return (
    <div className={`${styles.page} ${styles.paginaPublica}`}>
      <div className={styles.shell}>
        {error && <p className={styles.error}>{error}</p>}
        {!corte && !error && <p className={styles.cargando}>Cargando corte...</p>}
        {corte && (
          <>
            <div className={styles.barraPublica}>
              <button type="button" className={styles.botonSecundario} onClick={() => window.print()}>
                Imprimir
              </button>
              <button
                type="button"
                className={styles.botonSecundario}
                onClick={() => descargarExcel(corte.datos, titulo, corte.fecha).catch((e) => setError(mensajeError(e)))}
              >
                Descargar Excel
              </button>
            </div>
            <ReporteStock
              reporte={corte.datos}
              titulo="Stock de productos terminados"
              fechaTexto={`Corte al ${fechaHoraLima(corte.created_at)}`}
              nota={corte.nota}
            />
          </>
        )}
      </div>
    </div>
  );
}
