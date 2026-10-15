import logoMarca from "../assets/logo-marca.png";
import { desglose, formatoUnidades, presentacion, type ReporteStock as Reporte } from "../lib/reporteStock";
import styles from "./ReporteStock.module.css";

interface Props {
  reporte: Reporte;
  titulo: string;
  // Texto bajo el titulo: "Corte al 15/10/2026, 14:30" o "Stock al ...".
  fechaTexto: string;
  nota?: string | null;
}

// Hoja de stock de todos los productos terminados, agrupada por linea. Se usa en
// la pantalla de admin, en el link publico de un corte y al imprimir.
export function ReporteStock({ reporte, titulo, fechaTexto, nota }: Props) {
  return (
    <div className={`${styles.hoja} comprobante-imprimible`}>
      <div className={styles.cabecera}>
        <div className={styles.logoCaja}>
          <img className={styles.logo} src={logoMarca} alt="Destilería Andina" />
        </div>
        <div className={styles.cabeceraTexto}>
          <p className={styles.titulo}>{titulo}</p>
          <p className={styles.fecha}>{fechaTexto}</p>
          {nota && <p className={styles.nota}>{nota}</p>}
        </div>
      </div>

      <div className={styles.tablaWrap}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Presentación</th>
            <th className={styles.num}>Cajas / planchas</th>
            <th className={styles.num}>Sueltas</th>
            <th className={styles.num}>Total (u.)</th>
          </tr>
        </thead>
        {reporte.lineas.map((linea) => {
          const subtotal = linea.items.reduce((a, i) => a + i.stock, 0);
          return (
            <tbody key={linea.linea_id}>
              <tr className={styles.filaLinea}>
                <td colSpan={5} style={{ borderLeftColor: linea.color_dark ?? "#374151" }}>
                  {linea.nombre}
                </td>
              </tr>
              {linea.items.map((i) => {
                const { bultos, sueltas } = desglose(i);
                const agotado = i.stock <= 0;
                const unidad = i.tipo_envase === "unidad";
                return (
                  <tr key={i.producto_id} className={agotado ? styles.agotado : undefined}>
                    <td>{i.descripcion}</td>
                    <td>{presentacion(i)}</td>
                    <td className={styles.num}>{agotado || unidad ? "—" : formatoUnidades(bultos)}</td>
                    <td className={styles.num}>{agotado || unidad ? "—" : formatoUnidades(sueltas)}</td>
                    <td className={styles.num}>{agotado ? "Agotado" : formatoUnidades(i.stock)}</td>
                  </tr>
                );
              })}
              <tr className={styles.filaSubtotal}>
                <td colSpan={4}>Total {linea.nombre}</td>
                <td className={styles.num}>{formatoUnidades(subtotal)}</td>
              </tr>
            </tbody>
          );
        })}
        <tfoot>
          <tr>
            <td colSpan={4}>Total general</td>
            <td className={styles.num}>{formatoUnidades(reporte.total_unidades)} u.</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
