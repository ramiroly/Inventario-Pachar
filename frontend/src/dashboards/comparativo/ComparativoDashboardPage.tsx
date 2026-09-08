import { useEffect, useMemo, useState } from "react";
import { Bar, Chart } from "react-chartjs-2";
import type { ChartDataset, TooltipItem } from "chart.js";
import { api } from "../../lib/api";
import type { DashboardComparativoResponse, DetalleFormatoComparativo } from "../../types/models";
import { createBarDataLabelsPlugin } from "../shared/chartPlugins";
import { formatNum } from "../shared/format";
import styles from "./comparativo.module.css";

// Mismo orden y colores que COMPARATIVA TERMINADOS 1 DE SETIEMBRE.html.
const LN = ["Matacuy", "Licor de Café", "Añejo", "Reposado", "Botanizado", "Salqa Verde", "Cosecha", "Salqa Azul"];
const LC: Record<string, string> = {
  Matacuy: "#A0501A",
  "Salqa Azul": "#C0392B",
  "Salqa Verde": "#5E8C4A",
  Añejo: "#8B5E2E",
  Reposado: "#B86B2C",
  Cosecha: "#946846",
  Botanizado: "#C9702E",
  "Licor de Café": "#7A3B12",
};
// El gráfico principal usa azul plano (no por línea) para ambas barras —
// LC (arriba) se usa solo para el nombre de línea en la tabla ejecutiva.
const COLOR_ANTERIOR = "#8FC1E8";
const COLOR_ACTUAL = "#0B3D6B";

// Paleta dark/light específica del gráfico de detalle por línea
// seleccionada — distinta de LC. El original solo definía estas 4 líneas
// (únicas seleccionables ahí); el resto usa el mismo fallback que el HTML
// original (`LINE_COLORS[linea] || {dark:'#A0501A', light:'#E8B084'}`).
const LINE_COLORS_DETAIL: Record<string, { dark: string; light: string }> = {
  Matacuy: { dark: "#035B01", light: "#4FC150" },
  "Licor de Café": { dark: "#422302", light: "#A99C8D" },
  Cosecha: { dark: "#7D6608", light: "#C5B86A" },
  "Salqa Azul": { dark: "#0B3D6B", light: "#8FC1E8" },
};
const LINE_COLORS_DETAIL_FALLBACK = { dark: "#A0501A", light: "#E8B084" };
function detailColorsFor(linea: string) {
  return LINE_COLORS_DETAIL[linea] ?? LINE_COLORS_DETAIL_FALLBACK;
}

function cajasLabel(item: DetalleFormatoComparativo, stock: number): string {
  if (stock <= 0) return "0";
  if (item.tipo_envase === "unidad") return `${stock} unidad${stock !== 1 ? "es" : ""}`;
  const cajas = Math.floor(stock / item.upb);
  const sueltas = stock % item.upb;
  const tipo = item.tipo_envase === "plancha" ? "plancha" : "caja";
  let txt = `${cajas} ${tipo}${cajas !== 1 ? "s" : ""}`;
  if (sueltas > 0) txt += ` + ${sueltas} sueltas`;
  return txt;
}

export function ComparativoDashboardPage() {
  const [data, setData] = useState<DashboardComparativoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lineaSeleccionada, setLineaSeleccionada] = useState<string | null>(null);
  const [tblFiltro, setTblFiltro] = useState<"all" | "up" | "down" | "same">("all");

  useEffect(() => {
    api
      .get<DashboardComparativoResponse>("/dashboards/comparativo")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const porLinea = new Map(data.totales_por_linea.map((l) => [l.nombre, l]));
    const anteriorPorL = LN.map((l) => porLinea.get(l)?.stock_anterior ?? 0);
    const actualPorL = LN.map((l) => porLinea.get(l)?.stock_actual ?? 0);
    const deltas = LN.map((l, i) => ({ linea: l, delta: actualPorL[i] - anteriorPorL[i] }));
    const bestUp = [...deltas].sort((a, b) => b.delta - a.delta)[0];
    const bestDown = [...deltas].sort((a, b) => a.delta - b.delta)[0];
    const moved = deltas.filter((d) => d.delta !== 0);
    const totalAnterior = anteriorPorL.reduce((a, b) => a + b, 0);
    const totalActual = actualPorL.reduce((a, b) => a + b, 0);
    const lineasConMovimiento = moved.map((d) => d.linea);
    return { anteriorPorL, actualPorL, deltas, bestUp, bestDown, moved, totalAnterior, totalActual, lineasConMovimiento };
  }, [data]);

  useEffect(() => {
    if (!computed || lineaSeleccionada) return;
    setLineaSeleccionada(computed.lineasConMovimiento[0] ?? LN[0]);
  }, [computed, lineaSeleccionada]);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data || !computed) return <p>Cargando...</p>;

  const { anteriorPorL, actualPorL, bestUp, bestDown, moved, totalAnterior, totalActual, lineasConMovimiento } = computed;
  const netDelta = totalActual - totalAnterior;

  const productosPorLinea = (linea: string) =>
    data.detalle_por_formato.filter((d) => d.linea === linea && (d.stock_actual > 0 || d.stock_anterior > 0));

  const tblList = data.detalle_por_formato.filter((d) => {
    if (tblFiltro === "up") return d.variacion > 0;
    if (tblFiltro === "down") return d.variacion < 0;
    if (tblFiltro === "same") return d.variacion === 0;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.hdr}>
        <div>
          <h1>Comparativa Semanal de Stock</h1>
          <p>
            Destilería Pachar &middot; {data.fecha_corte_anterior} &rarr; {data.fecha_corte} &middot; Movimiento de
            inventario por línea y formato
          </p>
        </div>
        <div className={styles.badges}>
          <div className={`${styles.badge} ${styles.badgeNeu}`}>
            <strong>{formatNum(totalAnterior)}</strong>
            <span>Stock anterior</span>
          </div>
          <div className={`${styles.badge} ${styles.badgeNeu}`}>
            <strong>{formatNum(totalActual)}</strong>
            <span>Stock actual</span>
          </div>
          <div className={`${styles.badge} ${netDelta > 0 ? styles.badgeUp : netDelta < 0 ? styles.badgeDown : styles.badgeNeu}`}>
            <strong>
              {netDelta > 0 ? "+" : ""}
              {formatNum(netDelta)}
            </strong>
            <span>Variación neta</span>
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.kgrid}>
          <div className={`${styles.kpi} ${styles.kpiGrn}`}>
            <div className={styles.kl}>Mayor incremento</div>
            <div className={`${styles.kv} ${styles.kvGrn}`}>
              {bestUp.delta > 0 ? "+" : ""}
              {bestUp.delta} u.
            </div>
            <div className={styles.kd}>{bestUp.linea}</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiRed}`}>
            <div className={styles.kl}>Mayor caída</div>
            <div className={`${styles.kv} ${styles.kvRed}`}>{bestDown.delta} u.</div>
            <div className={styles.kd}>{bestDown.linea}</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiAmb}`}>
            <div className={styles.kl}>Líneas en movimiento</div>
            <div className={`${styles.kv} ${styles.kvAmb}`}>{moved.length}</div>
            <div className={styles.kd}>De {LN.length} líneas totales</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiBlu}`}>
            <div className={styles.kl}>Líneas estables</div>
            <div className={styles.kv} style={{ color: "#7A3B12" }}>
              {LN.length - moved.length}
            </div>
            <div className={styles.kd}>Sin cambio neto</div>
          </div>
        </div>

        <p className={styles.sec}>
          Comparación de stock por línea &mdash; {data.fecha_corte_anterior} vs {data.fecha_corte} (barras agrupadas)
        </p>
        <div className={styles.card} style={{ marginBottom: 18 }}>
          <div className={styles.cardT}>
            Unidades totales por línea, corte anterior vs actual &middot; Pasa el cursor para ver el desglose en cajas
          </div>
          <div className={styles.leg}>
            <span>
              <span className={styles.lsq} style={{ background: COLOR_ANTERIOR }} />
              {data.fecha_corte_anterior} (anterior)
            </span>
            <span>
              <span className={styles.lsq} style={{ background: COLOR_ACTUAL }} />
              {data.fecha_corte} (actual)
            </span>
          </div>
          <div style={{ position: "relative", width: "100%", height: 360 }}>
            <Chart
              type="bar"
              data={{
                labels: LN,
                datasets: [
                  { type: "bar" as const, label: data.fecha_corte_anterior, data: anteriorPorL, backgroundColor: COLOR_ANTERIOR, borderWidth: 0, order: 2 },
                  { type: "bar" as const, label: data.fecha_corte, data: actualPorL, backgroundColor: COLOR_ACTUAL, borderWidth: 0, order: 2 },
                  {
                    type: "line" as const,
                    label: "Tendencia anterior",
                    data: anteriorPorL,
                    borderColor: "rgba(143,193,232,0.7)",
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                    order: 1,
                  },
                  {
                    type: "line" as const,
                    label: "Tendencia actual",
                    data: actualPorL,
                    borderColor: "rgba(11,61,107,0.85)",
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: COLOR_ACTUAL,
                    fill: false,
                    tension: 0.3,
                    order: 0,
                  },
                  // Chart.js soporta charts mixtos bar+line en runtime (cada dataset trae
                  // su propio `type`), pero react-chartjs-2 tipa `data` con el tipo fijo
                  // del prop `type` del componente — este cast solo relaja el chequeo de
                  // TypeScript, no cambia el comportamiento real.
                ] as unknown as ChartDataset<"bar", number[]>[],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    filter: (item: TooltipItem<"bar">) => item.dataset.type === "bar",
                    callbacks: {
                      label: (ctx) => ` ${ctx.dataset.label}: ${formatNum(ctx.raw as number)} u. total`,
                      afterLabel: (ctx) => {
                        const linea = LN[ctx.dataIndex];
                        const esAnterior = ctx.dataset.label === data.fecha_corte_anterior;
                        return productosPorLinea(linea).map((p) => {
                          const stock = esAnterior ? p.stock_anterior : p.stock_actual;
                          if (stock <= 0) return `${p.descripcion}: —`;
                          return `${p.descripcion}: ${cajasLabel(p, stock)}`;
                        });
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 20 } },
                  y: { grid: { color: "rgba(122,59,18,.06)" }, ticks: { font: { size: 10 } } },
                },
              }}
              plugins={[createBarDataLabelsPlugin()]}
            />
          </div>
        </div>

        <p className={styles.sec}>Variación por presentación &mdash; detalle por línea seleccionada</p>
        <div className={styles.card} style={{ marginBottom: 18 }}>
          <div className={styles.cardT}>Stock por SKU, {data.fecha_corte_anterior} vs {data.fecha_corte}</div>
          <div className={styles.filters}>
            {(lineasConMovimiento.length ? lineasConMovimiento : LN).map((l) => (
              <button
                key={l}
                className={`${styles.fbtn} ${lineaSeleccionada === l ? styles.fbtnActive : ""}`}
                onClick={() => setLineaSeleccionada(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className={styles.leg}>
            <span>
              <span className={styles.lsq} style={{ background: lineaSeleccionada ? detailColorsFor(lineaSeleccionada).light : "#E8B084" }} />
              {data.fecha_corte_anterior}
            </span>
            <span>
              <span className={styles.lsq} style={{ background: lineaSeleccionada ? detailColorsFor(lineaSeleccionada).dark : "#A0501A" }} />
              {data.fecha_corte}
            </span>
          </div>
          {lineaSeleccionada && (
            <FormatDetailChart items={productosPorLinea(lineaSeleccionada)} colors={detailColorsFor(lineaSeleccionada)} />
          )}
        </div>

        <p className={styles.sec}>Tabla detallada de variación por producto</p>
        <div className={styles.card} style={{ marginBottom: 22 }}>
          <div className={styles.filters}>
            <button className={`${styles.fbtn} ${tblFiltro === "all" ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro("all")}>
              Todas
            </button>
            <button className={`${styles.fbtn} ${tblFiltro === "up" ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro("up")}>
              Solo incrementos
            </button>
            <button className={`${styles.fbtn} ${tblFiltro === "down" ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro("down")}>
              Solo caídas
            </button>
            <button className={`${styles.fbtn} ${tblFiltro === "same" ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro("same")}>
              Sin cambio
            </button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Línea</th>
                <th style={{ textAlign: "right" }}>{data.fecha_corte_anterior}</th>
                <th style={{ textAlign: "right" }}>{data.fecha_corte}</th>
                <th style={{ textAlign: "right" }}>Variación</th>
                <th style={{ textAlign: "center" }}>Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {tblList.map((d) => {
                const pill = d.variacion > 0 ? styles.pUp : d.variacion < 0 ? styles.pDown : styles.pNeu;
                const lbl = d.variacion > 0 ? "Incrementó" : d.variacion < 0 ? "Disminuyó" : "Sin cambio";
                const arrow = d.variacion > 0 ? "▲" : d.variacion < 0 ? "▼" : "—";
                return (
                  <tr key={d.producto_id}>
                    <td style={{ fontWeight: 500 }}>{d.descripcion}</td>
                    <td>
                      <span style={{ fontSize: 10, color: LC[d.linea] ?? "#555", fontWeight: 600 }}>{d.linea}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>{d.stock_anterior}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{d.stock_actual}</td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: d.variacion > 0 ? "#3F6B2C" : d.variacion < 0 ? "#A33A24" : "#A6927F",
                      }}
                    >
                      {d.variacion > 0 ? "+" : ""}
                      {d.variacion}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`${styles.pill} ${pill}`}>
                        {arrow} {lbl}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.footer}>
        Destilería Pachar &middot; Comparativa semanal de inventario &middot; Cortes: {data.fecha_corte_anterior} y{" "}
        {data.fecha_corte}
      </div>
    </div>
  );
}

function FormatDetailChart({ items, colors }: { items: DetalleFormatoComparativo[]; colors: { dark: string; light: string } }) {
  const labels = items.map((i) => i.descripcion);
  const anterior = items.map((i) => i.stock_anterior);
  const actual = items.map((i) => i.stock_actual);

  return (
    <div style={{ position: "relative", width: "100%", height: 280 }}>
      <Bar
        data={{
          labels,
          datasets: [
            { label: "Anterior", data: anterior, backgroundColor: colors.light, borderWidth: 0 },
            { label: "Actual", data: actual, backgroundColor: colors.dark, borderWidth: 0 },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${formatNum(ctx.raw as number)} u.`,
                afterLabel: (ctx) => cajasLabel(items[ctx.dataIndex], ctx.raw as number),
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { grid: { color: "rgba(122,59,18,.06)" }, ticks: { font: { size: 10 } } },
          },
        }}
        plugins={[createBarDataLabelsPlugin()]}
      />
    </div>
  );
}
