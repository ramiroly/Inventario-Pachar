import logoMarca from "../assets/logo-marca.png";
import { formatoFecha } from "../lib/fechas";
import { formatoLitros } from "../lib/numeros";
import {
  litrosEnPreparacion,
  litrosSubproductos,
  litrosTerminados,
  lotesAprobados,
  lotesEnPreparacion,
  ocupacion,
  type ReporteLiquidos as Reporte,
  type TanqueReporteLiquidos,
} from "../lib/reporteLiquidos";
import { ETIQUETA_ESTADO } from "../types/models";
import styles from "./ReporteStock.module.css";

interface Props {
  reporte: Reporte;
  titulo: string;
  // Texto bajo el titulo: "Corte al 17/10/2026, 14:30" o "Stock al ...".
  fechaTexto: string;
  nota?: string | null;
}

// Hoja de litros de todos los tanques, agrupada por linea. Se usa en la pantalla de
// admin, en el link publico de un corte y al imprimir. Comparte estilos con el
// reporte de productos terminados.
export function ReporteLiquidos({ reporte, titulo, fechaTexto, nota }: Props) {
  const fila = (t: TanqueReporteLiquidos) => {
    const oc = ocupacion(t);
    return (
      <tr key={t.tanque_id} className={t.litros <= 0 ? styles.agotado : undefined}>
        <td>{t.nombre}</td>
        <td>
          {t.lote ?? "—"}
          {t.estado && t.estado !== "terminado" && <span> · {ETIQUETA_ESTADO[t.estado].toLowerCase()}</span>}
        </td>
        <td className={styles.num}>{t.capacidad_litros === null ? "—" : formatoLitros(t.capacidad_litros)}</td>
        <td className={styles.num}>{formatoLitros(t.litros)}</td>
        <td className={styles.num}>{oc === null ? "—" : `${oc}%`}</td>
      </tr>
    );
  };

  return (
    <div className={`${styles.hoja} comprobante-imprimible`}>
      <div className={styles.cabecera}>
        <div className={styles.logoCaja}>
          <img className={styles.logo} src={logoMarca} alt="Destilería Andina" />
        </div>
        <div className={styles.cabeceraTexto}>
          <p className={styles.titulo}>{titulo}</p>
          <p className={styles.fecha}>{fechaTexto}</p>
          <p className={styles.fecha}>
            {reporte.fecha_ultimo_corte
              ? `Medición del ${formatoFecha(reporte.fecha_ultimo_corte)} más movimientos posteriores`
              : "Sin mediciones registradas"}
          </p>
          {nota && <p className={styles.nota}>{nota}</p>}
        </div>
      </div>

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Tanque</th>
              <th>Lote</th>
              <th className={styles.num}>Capacidad (L)</th>
              <th className={styles.num}>Litros</th>
              <th className={styles.num}>Ocupación</th>
            </tr>
          </thead>
          {reporte.lineas.map((linea) => (
            <tbody key={linea.linea_id}>
              <tr className={styles.filaLinea}>
                <td colSpan={5} style={{ borderLeftColor: linea.color_dark ?? "#374151" }}>
                  {linea.nombre}
                </td>
              </tr>
              {lotesAprobados(linea).length > 0 && (
                <>
                  <tr className={styles.filaSeccion}>
                    <td colSpan={5}>Terminado</td>
                  </tr>
                  {lotesAprobados(linea).map(fila)}
                </>
              )}
              {lotesEnPreparacion(linea).length > 0 && (
                <>
                  <tr className={styles.filaSeccion}>
                    <td colSpan={5}>En preparación (en proceso / en reposo)</td>
                  </tr>
                  {lotesEnPreparacion(linea).map(fila)}
                </>
              )}
              {linea.subs.length > 0 && (
                <>
                  <tr className={styles.filaSeccion}>
                    <td colSpan={5}>Subproductos</td>
                  </tr>
                  {linea.subs.map(fila)}
                </>
              )}
              <tr className={styles.filaSubtotal}>
                <td colSpan={3}>
                  Total {linea.nombre} · terminado {formatoLitros(litrosTerminados(linea))} L · en preparación{" "}
                  {formatoLitros(litrosEnPreparacion(linea))} L · subproductos {formatoLitros(litrosSubproductos(linea))} L
                </td>
                <td className={styles.num}>
                  {formatoLitros(litrosTerminados(linea) + litrosEnPreparacion(linea) + litrosSubproductos(linea))}
                </td>
                <td />
              </tr>
            </tbody>
          ))}
          <tfoot>
            <tr>
              <td colSpan={3}>Total terminados</td>
              <td className={styles.num}>{formatoLitros(reporte.total_terminados)} L</td>
              <td />
            </tr>
            <tr>
              <td colSpan={3}>Total en preparación</td>
              <td className={styles.num}>{formatoLitros(reporte.total_en_preparacion ?? 0)} L</td>
              <td />
            </tr>
            <tr>
              <td colSpan={3}>Total subproductos</td>
              <td className={styles.num}>{formatoLitros(reporte.total_subproductos)} L</td>
              <td />
            </tr>
            <tr>
              <td colSpan={3}>Total general</td>
              <td className={styles.num}>{formatoLitros(reporte.total_litros)} L</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
