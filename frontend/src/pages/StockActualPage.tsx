import { useCallback, useEffect, useState } from "react";
import { ReporteStock } from "../components/ReporteStock";
import { SubPestanas, SUBPESTANAS_MOVIMIENTOS } from "../components/SubPestanas";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { formatoFecha, hoyLocal } from "../lib/fechas";
import {
  descargarExcel,
  fechaHoraLima,
  formatoUnidades,
  urlCorte,
  type CorteStockPublico,
  type CorteStockResumen,
  type ReporteStock as Reporte,
} from "../lib/reporteStock";
import styles from "./stockActual.module.css";

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function StockActualPage() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargadoEn, setCargadoEn] = useState<string>(() => new Date().toISOString());
  const [cortes, setCortes] = useState<CorteStockResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [r, c] = await Promise.all([
      api.get<Reporte>("/cortes-stock/actual"),
      api.get<CorteStockResumen[]>("/cortes-stock"),
    ]);
    setReporte(r);
    setCortes(c);
    setCargadoEn(new Date().toISOString());
  }, []);

  useEffect(() => {
    cargar()
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, [cargar]);

  async function actualizar() {
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  async function guardarCorte() {
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      const nuevo = await api.post<CorteStockResumen>("/cortes-stock", { nota: nota.trim() || null });
      await cargar();
      setNota("");
      setMensaje(
        `Corte guardado: ${fechaHoraLima(nuevo.created_at)} · ${formatoUnidades(nuevo.total_unidades)} u. Ya aparece en la lista y tiene su propio link.`
      );
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  async function copiarLink(c: CorteStockResumen) {
    const ok = await copiarTexto(urlCorte(c.token));
    setError(null);
    setMensaje(ok ? `Link del corte del ${formatoFecha(c.fecha)} copiado.` : `Copia este link: ${urlCorte(c.token)}`);
  }

  async function excelDeCorte(c: CorteStockResumen) {
    setError(null);
    try {
      const corte = await api.get<CorteStockPublico>(`/publico/corte-stock/${c.token}`);
      await descargarExcel(corte.datos, `Stock de productos terminados — corte al ${fechaHoraLima(c.created_at)}`, c.fecha);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function retirar(c: CorteStockResumen) {
    const ok = window.confirm(
      `¿Retirar el corte del ${fechaHoraLima(c.created_at)}?\n\nDesaparece de esta lista y su link deja de funcionar. Los movimientos no se tocan.`
    );
    if (!ok) return;
    setError(null);
    try {
      await api.patch(`/cortes-stock/${c.id}/retirar`, {});
      await cargar();
      setMensaje("Corte retirado.");
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <SubPestanas opciones={SUBPESTANAS_MOVIMIENTOS} actual="/movimientos/stock-actual" />
        <header className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Stock actual de productos terminados</h1>
            <p className={styles.subtitulo}>
              Todos los productos: principales, 700 ml, inglés y garrafas. Imprímelo, descárgalo en Excel o guarda un
              corte para conservar el stock de hoy y compartirlo por link.
            </p>
          </div>
        </header>

        {mensaje && <p className={styles.exito}>{mensaje}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.acciones}>
          <button type="button" className={styles.botonSecundario} disabled={!reporte || cargando} onClick={() => window.print()}>
            Imprimir
          </button>
          <button
            type="button"
            className={styles.botonSecundario}
            disabled={!reporte || cargando}
            onClick={() =>
              reporte &&
              descargarExcel(reporte, `Stock de productos terminados — ${fechaHoraLima(cargadoEn)}`, hoyLocal()).catch((e) =>
                setError(mensajeError(e))
              )
            }
          >
            Descargar Excel
          </button>
          <button type="button" className={styles.botonSecundario} disabled={cargando} onClick={actualizar}>
            Actualizar
          </button>
          <div className={styles.guardar}>
            <input
              className={styles.input}
              type="text"
              maxLength={200}
              placeholder="Nota del corte (opcional)"
              aria-label="Nota del corte"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <button type="button" className={styles.boton} disabled={guardando || !reporte} onClick={guardarCorte}>
              {guardando ? "Guardando..." : "Guardar corte"}
            </button>
          </div>
        </div>

        {cargando && !reporte ? (
          <p className={styles.cargando}>Cargando stock...</p>
        ) : (
          reporte && (
            <ReporteStock
              reporte={reporte}
              titulo="Stock de productos terminados"
              fechaTexto={`Stock al ${fechaHoraLima(cargadoEn)}`}
            />
          )
        )}

        <section className={styles.historial}>
          <h2 className={styles.historialTitulo}>Cortes guardados</h2>
          {cortes.length === 0 ? (
            <p className={styles.vacio}>Aún no hay cortes guardados. Pulsa «Guardar corte» para crear el primero.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Nota</th>
                    <th className={styles.num}>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cortes.map((c) => (
                    <tr key={c.id}>
                      <td>{fechaHoraLima(c.created_at)}</td>
                      <td className={styles.celdaNota}>{c.nota ?? "—"}</td>
                      <td className={styles.num}>{formatoUnidades(c.total_unidades)} u.</td>
                      <td>
                        <div className={styles.filaAcciones}>
                          <a className={styles.accion} href={`/corte/${c.token}`} target="_blank" rel="noreferrer">
                            Ver / imprimir
                          </a>
                          <button type="button" className={styles.accion} onClick={() => copiarLink(c)}>
                            Copiar link
                          </button>
                          <button type="button" className={styles.accion} onClick={() => excelDeCorte(c)}>
                            Excel
                          </button>
                          <button type="button" className={`${styles.accion} ${styles.accionPeligro}`} onClick={() => retirar(c)}>
                            Retirar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
