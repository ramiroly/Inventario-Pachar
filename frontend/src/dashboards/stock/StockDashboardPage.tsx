import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import type { Chart as ChartJSCore } from "chart.js";
import { api } from "../../lib/api";
import type { DashboardStockResponse, ProductoDashboard } from "../../types/models";
import { createBarDataLabelsPlugin, createDonutPercentPlugin } from "../shared/chartPlugins";
import { useFloatingTooltip } from "../shared/useFloatingTooltip";
import { formatNum } from "../shared/format";
import styles from "./stock.module.css";

// Mismo orden y colores por línea que INVENTARIOS TERMINADOS 1 SETIEMBRE.html
// (paleta específica de este dashboard — no la de la tabla `lineas`).
const LN = ["Matacuy", "Licor de Café", "Añejo", "Reposado", "Botanizado", "Salqa Verde", "Cosecha", "Salqa Azul"];
const LC: Record<string, string> = {
  Matacuy: "#1A5276",
  "Salqa Azul": "#C0392B",
  "Salqa Verde": "#1E8449",
  Añejo: "#6C3483",
  Reposado: "#117A65",
  Cosecha: "#7D6608",
  Botanizado: "#A04000",
  "Licor de Café": "#0F6E56",
};
const FMT_COLORS = { f750: "#1A5276", f375: "#117A65", f50: "#D4811A" };

function isF750(p: ProductoDashboard) {
  return p.formato === 750;
}
function isF375(p: ProductoDashboard) {
  return p.formato === 375;
}
function isF50(p: ProductoDashboard) {
  return p.formato === 50;
}

function cajasLabel(p: ProductoDashboard): string {
  if (p.stock <= 0) return "AGOTADO";
  const tipo = p.tipo_envase === "plancha" ? "plancha" : "caja";
  let txt = `${p.cajas} ${tipo}${p.cajas !== 1 ? "s" : ""}`;
  if (p.sueltas > 0) txt += ` + ${p.sueltas} sueltas`;
  return txt;
}

function estadoDe(stock: number): { pill: string; label: string } {
  if (stock <= 0) return { pill: styles.pDanger, label: "Agotado" };
  if (stock < 60) return { pill: styles.pWarn, label: "Alerta" };
  return { pill: styles.pOk, label: "En stock" };
}

function covColor(weeks: number | null): string {
  if (weeks === null) return "#9CA3AF";
  if (weeks < 2) return "#C0392B";
  if (weeks < 4) return "#D4811A";
  return "#27AE60";
}
function covLabel(weeks: number | null): string {
  if (weeks === null) return "Sin salidas";
  if (weeks < 2) return "CRÍTICO";
  if (weeks < 4) return "ALERTA";
  return "OK";
}

export function StockDashboardPage() {
  const [data, setData] = useState<DashboardStockResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semFiltro, setSemFiltro] = useState("all");
  const [tblFiltro, setTblFiltro] = useState("all");
  const mainChartRef = useRef<ChartJSCore<"bar"> | null>(null);
  const tooltip = useFloatingTooltip(styles.tooltipBox);

  useEffect(() => {
    api
      .get<DashboardStockResponse>("/dashboards/stock")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const productos = data.productos;

    const stockByL = LN.map((l) => productos.filter((p) => p.linea === l).reduce((a, p) => a + Math.max(0, p.stock), 0));
    const totalStock = productos.reduce((a, p) => a + Math.max(0, p.stock), 0);
    const agotados = productos.filter((p) => p.stock <= 0);
    const conStock = productos.filter((p) => p.stock > 0);
    const warnList = productos.filter((p) => p.stock > 0 && p.stock < 60);
    const topIdx = stockByL.indexOf(Math.max(...stockByL));

    const d750 = LN.map((l) => productos.filter((p) => p.linea === l && isF750(p)).reduce((a, p) => a + Math.max(0, p.stock), 0));
    const d375 = LN.map((l) => productos.filter((p) => p.linea === l && isF375(p)).reduce((a, p) => a + Math.max(0, p.stock), 0));
    const d50 = LN.map((l) => productos.filter((p) => p.linea === l && isF50(p)).reduce((a, p) => a + Math.max(0, p.stock), 0));

    const agotLineas = [...new Set(agotados.map((p) => p.linea))].slice(0, 3).join(", ");

    return { productos, stockByL, totalStock, agotados, conStock, warnList, topIdx, d750, d375, d50, agotLineas };
  }, [data]);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data || !computed) return <p>Cargando...</p>;

  const { productos, stockByL, totalStock, agotados, conStock, warnList, topIdx, d750, d375, d50, agotLineas } = computed;

  function handleMainChartHover(e: React.MouseEvent<HTMLDivElement>) {
    const chart = mainChartRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(e.nativeEvent, "nearest", { intersect: true }, false);
    if (!points.length) {
      tooltip.hide();
      return;
    }
    const { datasetIndex, index } = points[0];
    const linea = LN[index];
    const fmtKeys = ["750", "375", "50"] as const;
    const fmtKey = fmtKeys[datasetIndex];
    const fmtLabel = fmtKey === "50" ? "50 ml" : fmtKey + " ml";
    const items = productos.filter((p) => p.linea === linea && String(p.formato) === fmtKey && p.stock > 0);
    tooltip.show(
      <>
        <div className={styles.ttTitle}>
          {linea} — {fmtLabel}
        </div>
        {items.length === 0 ? (
          <div className={styles.ttRow}>
            <span className={styles.ttLbl}>Sin stock</span>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.producto_id}>
              <div className={styles.ttRow}>
                <span className={styles.ttLbl}>Unidades</span>
                <span className={styles.ttVal}>{formatNum(it.stock)} u.</span>
              </div>
              <div className={styles.ttRow}>
                <span className={styles.ttLbl}>En cajas</span>
                <span className={styles.ttVal} style={{ color: "#FFD66B" }}>
                  {cajasLabel(it)}
                </span>
              </div>
            </div>
          ))
        )}
      </>
    );
  }

  const coverageSorted = [...data.lineas].sort((a, b) => {
    const wa = a.cobertura_semanas;
    const wb = b.cobertura_semanas;
    if (wa === null && wb === null) return 0;
    if (wa === null) return 1;
    if (wb === null) return -1;
    return wa - wb;
  });
  const maxRate = Math.max(...data.lineas.map((l) => l.weekly_rate), 1);

  const semList = productos
    .filter((p) => semFiltro === "all" || p.linea === semFiltro)
    .sort((a, b) => b.stock - a.stock);
  const maxStockSem = Math.max(...productos.map((p) => Math.max(0, p.stock)), 1);

  const tblList = productos.filter((p) => tblFiltro === "all" || p.linea === tblFiltro);

  const ft750 = d750.reduce((a, b) => a + b, 0);
  const ft375 = d375.reduce((a, b) => a + b, 0);
  const ft50 = d50.reduce((a, b) => a + b, 0);

  return (
    <div className={styles.page} onMouseLeave={() => tooltip.hide()}>
      {tooltip.tooltip}
      <div className={styles.hdr}>
        <div>
          <h1>Dashboard — Productos Terminados</h1>
          <p>Destilería Pachar &middot; Corte: {data.periodo.hasta} &middot; Revisión interna de operaciones</p>
        </div>
        <div className={styles.badges}>
          <div className={`${styles.badge} ${styles.badgeOk}`}>
            <strong>{formatNum(totalStock)}</strong>
            <span>Unid. en stock</span>
          </div>
          <div className={styles.badge}>
            <strong>{LN.length}</strong>
            <span>Líneas</span>
          </div>
          <div className={styles.badge}>
            <strong>{conStock.length}</strong>
            <span>Con stock</span>
          </div>
          <div className={`${styles.badge} ${styles.badgeDanger}`}>
            <strong>{agotados.length}</strong>
            <span>Agotados</span>
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.kgrid}>
          <div className={`${styles.kpi} ${styles.kpiGrn}`}>
            <div className={styles.kl}>Stock total</div>
            <div className={`${styles.kv} ${styles.kvGrn}`}>{formatNum(totalStock)}</div>
            <div className={styles.kd}>
              {conStock.length} con stock, {agotados.length} agotados de {productos.length}
            </div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiBlu}`}>
            <div className={styles.kl}>Línea dominante</div>
            <div className={styles.kv} style={{ fontSize: 16 }}>
              {LN[topIdx]}
            </div>
            <div className={styles.kd}>
              {formatNum(stockByL[topIdx])} u. {totalStock > 0 ? Math.round((stockByL[topIdx] / totalStock) * 100) : 0}% del
              total
            </div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiAmb}`}>
            <div className={styles.kl}>SKUs en alerta</div>
            <div className={`${styles.kv} ${styles.kvAmb}`}>{warnList.length}</div>
            <div className={styles.kd}>Menos de 60 unidades</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiRed}`}>
            <div className={styles.kl}>SKUs agotados</div>
            <div className={`${styles.kv} ${styles.kvRed}`}>
              {agotados.length} / {productos.length}
            </div>
            <div className={styles.kd}>{agotLineas || "—"}</div>
          </div>
        </div>

        {(agotados.length > 0 || warnList.length > 0) && (
          <div className={styles.alertBar}>
            <strong>
              Alertas: {agotados.length} SKUs agotados, {warnList.length} en alerta
            </strong>
            <div className={styles.alertTags}>
              {agotados.map((p) => (
                <span key={p.producto_id} className={`${styles.atag} ${styles.atagRed}`}>
                  {p.descripcion}
                </span>
              ))}
              {warnList.map((p) => (
                <span key={p.producto_id} className={`${styles.atag} ${styles.atagAmber}`}>
                  {p.descripcion} ({p.stock} u.)
                </span>
              ))}
            </div>
          </div>
        )}

        <p className={styles.sec}>
          Stock por línea de producto — diferenciado por presentación (750 ml &middot; 375 ml &middot; 50 ml)
        </p>
        <div className={styles.card} style={{ marginBottom: 18 }}>
          <div className={styles.cardT}>
            Unidades en stock por línea y formato &middot; Pasa el cursor sobre las barras para ver el detalle de cajas
          </div>
          <div className={styles.leg}>
            <span>
              <span className={styles.lsq} style={{ background: FMT_COLORS.f750 }} />
              750 ml — 6 u/caja
            </span>
            <span>
              <span className={styles.lsq} style={{ background: FMT_COLORS.f375 }} />
              375 ml — 6 u/caja
            </span>
            <span>
              <span className={styles.lsq} style={{ background: FMT_COLORS.f50 }} />
              50 ml — 60 u/caja &middot; Matacuy 50ml: 111 u/plancha
            </span>
          </div>
          <div style={{ position: "relative", width: "100%", height: 360 }} onMouseMove={handleMainChartHover}>
            <Bar
              ref={mainChartRef as never}
              data={{
                labels: LN,
                datasets: [
                  { label: "750 ml", data: d750, backgroundColor: FMT_COLORS.f750, borderWidth: 0 },
                  { label: "375 ml", data: d375, backgroundColor: FMT_COLORS.f375, borderWidth: 0 },
                  { label: "50 ml", data: d50, backgroundColor: FMT_COLORS.f50, borderWidth: 0 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12 } }, tooltip: { enabled: false } },
                scales: {
                  x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
                  y: { stacked: true, grid: { color: "rgba(0,0,0,.05)" }, ticks: { font: { size: 10 } } },
                },
              }}
              plugins={[
                createBarDataLabelsPlugin({ font: "700 10px 'Segoe UI',Arial", strokeStyle: "rgba(0,0,0,0.55)", lineWidth: 3 }),
              ]}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
              Desglose en cajas / planchas y unidades sueltas por línea
            </div>
            <div className={styles.cajasGrid}>
              {LN.map((l) => {
                const items = productos.filter((p) => p.linea === l);
                if (!items.length) return null;
                return (
                  <div key={l} className={styles.cajaCard}>
                    <div className={styles.cajaLinea} style={{ color: LC[l] }}>
                      {l}
                    </div>
                    {items.map((p) => (
                      <div key={p.producto_id} className={styles.cajaRow}>
                        <span>{p.descripcion.replace("SALQA ", "")}</span>
                        <span style={{ color: p.stock <= 0 ? "#C0392B" : "#1B4332" }}>
                          {p.stock <= 0 ? "AGOTADO" : `${formatNum(p.stock)} u. = ${cajasLabel(p)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className={styles.sec}>Distribución del stock por presentación</p>
        <div className={styles.g2}>
          <DonutCard title="Participación — Presentación 750 ml (solo líneas con stock)" values={d750} />
          <DonutCard title="Participación — Presentación 375 ml (solo líneas con stock)" values={d375} />
        </div>

        <p className={styles.sec}>Salidas de productos por destino</p>
        <SalidasSection salidas={data.salidas} />

        <p className={styles.sec}>Cobertura estimada y alertas de reposición ({data.periodo.dias} días de referencia)</p>
        <div className={styles.g2}>
          <div className={styles.card}>
            <div className={styles.cardT}>
              Semanas de cobertura estimada por línea &nbsp;&middot;&nbsp; <span style={{ color: "#C0392B" }}>■</span> &lt;2
              sem <span style={{ color: "#D4811A" }}>■</span> 2–4 sem <span style={{ color: "#27AE60" }}>■</span> &gt;4 sem
            </div>
            {LN.map((l) => {
              const linea = data.lineas.find((x) => x.nombre === l);
              if (!linea) return null;
              const col = covColor(linea.cobertura_semanas);
              const wTxt = linea.cobertura_semanas !== null ? `${linea.cobertura_semanas.toFixed(1)} sem` : "Sin salidas";
              const bw = maxRate > 0 ? Math.round((linea.weekly_rate / maxRate) * 100) : 0;
              return (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, minWidth: 120, color: "#374151" }}>{l}</div>
                  <div style={{ flex: 1, background: "#F0F4F0", borderRadius: 4, height: 18, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${bw}%`,
                        height: "100%",
                        background: col,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 6,
                      }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                        {linea.weekly_rate.toFixed(0)} u/sem
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: col, minWidth: 70, textAlign: "right" }}>{wTxt}</div>
                </div>
              );
            })}
          </div>
          <div className={styles.card}>
            <div className={styles.cardT}>Alertas de reposición — ordenadas por urgencia</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Línea</th>
                  <th style={{ textAlign: "right" }}>Stock</th>
                  <th style={{ textAlign: "right" }}>Salidas/sem</th>
                  <th style={{ textAlign: "right" }}>Cobertura</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {coverageSorted.map((l) => {
                  const col = covColor(l.cobertura_semanas);
                  const lbl = covLabel(l.cobertura_semanas);
                  const wTxt = l.cobertura_semanas !== null ? `${l.cobertura_semanas.toFixed(1)} sem` : "--";
                  return (
                    <tr key={l.linea_id}>
                      <td style={{ fontWeight: 600, color: "#374151" }}>{l.nombre}</td>
                      <td style={{ textAlign: "right" }}>{formatNum(l.stock)} u.</td>
                      <td style={{ textAlign: "right", color: "#6B7280" }}>{l.weekly_rate.toFixed(0)} u/sem</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: col }}>{wTxt}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background:
                              l.cobertura_semanas === null ? "#F3F4F6" : l.cobertura_semanas < 2 ? "#FEE2E2" : l.cobertura_semanas < 4 ? "#FEF3C7" : "#D1FAE5",
                            color:
                              l.cobertura_semanas === null ? "#6B7280" : l.cobertura_semanas < 2 ? "#991B1B" : l.cobertura_semanas < 4 ? "#92400E" : "#065F46",
                          }}
                        >
                          {lbl}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className={styles.sec}>Semáforo de criticidad por SKU — stock, cajas y unidades sueltas</p>
        <div className={styles.g31}>
          <div className={styles.card}>
            <div className={styles.cardT}>Estado de stock por producto con desglose &middot; Filtrar por línea:</div>
            <div className={styles.filters}>
              <button className={`${styles.fbtn} ${semFiltro === "all" ? styles.fbtnActive : ""}`} onClick={() => setSemFiltro("all")}>
                Todos
              </button>
              {LN.map((l) => (
                <button key={l} className={`${styles.fbtn} ${semFiltro === l ? styles.fbtnActive : ""}`} onClick={() => setSemFiltro(l)}>
                  {l}
                </button>
              ))}
            </div>
            <div className={styles.leg}>
              <span>
                <span className={styles.lsq} style={{ background: "#27AE60" }} />
                Saludable (&ge;60)
              </span>
              <span>
                <span className={styles.lsq} style={{ background: "#D4811A" }} />
                Alerta (1&ndash;59)
              </span>
              <span>
                <span className={styles.lsq} style={{ background: "#C0392B" }} />
                Agotado (0)
              </span>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
              {semList.map((p) => {
                const col = p.stock <= 0 ? "#C0392B" : p.stock < 60 ? "#D4811A" : "#27AE60";
                const pct = maxStockSem > 0 ? Math.max(2, Math.round((p.stock / maxStockSem) * 100)) : 2;
                return (
                  <div key={p.producto_id} className={styles.semRow}>
                    <div className={styles.semLabel} title={p.descripcion}>
                      {p.descripcion}
                    </div>
                    <div className={styles.semBarWrap}>
                      <div className={styles.semBar} style={{ width: `${pct}%`, background: col }}>
                        <span className={styles.semVal}>{p.stock > 0 ? p.stock : ""}</span>
                      </div>
                    </div>
                    <div className={styles.semExtra} style={{ color: col }}>
                      {cajasLabel(p)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardT}>Stock total por formato</div>
            <div style={{ position: "relative", width: "100%", height: 220 }}>
              <Doughnut
                data={{
                  labels: ["750 ml", "375 ml", "50 ml"],
                  datasets: [{ data: [ft750, ft375, ft50], backgroundColor: [FMT_COLORS.f750, FMT_COLORS.f375, FMT_COLORS.f50], borderWidth: 3, borderColor: "#fff" }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "50%",
                  plugins: {
                    legend: { position: "right", labels: { font: { size: 10 }, boxWidth: 10 } },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatNum(ctx.raw as number)} u.` } },
                  },
                }}
                plugins={[createDonutPercentPlugin([ft750, ft375, ft50], 6)]}
              />
            </div>
          </div>
        </div>

        <p className={styles.sec}>Tabla ejecutiva — todos los productos con desglose de cajas</p>
        <div className={styles.card} style={{ marginBottom: 22 }}>
          <div className={styles.filters}>
            <button className={`${styles.fbtn} ${tblFiltro === "all" ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro("all")}>
              Todas
            </button>
            {LN.map((l) => (
              <button key={l} className={`${styles.fbtn} ${tblFiltro === l ? styles.fbtnActive : ""}`} onClick={() => setTblFiltro(l)}>
                {l}
              </button>
            ))}
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Línea</th>
                <th style={{ textAlign: "right" }}>Stock (u.)</th>
                <th style={{ textAlign: "right" }}>Cajas / Planchas</th>
                <th style={{ textAlign: "right" }}>Sueltas</th>
                <th style={{ textAlign: "center" }}>Ud./envase</th>
                <th style={{ textAlign: "center" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tblList.map((p) => {
                const { pill, label } = estadoDe(p.stock);
                return (
                  <tr key={p.producto_id}>
                    <td style={{ fontWeight: 500 }}>{p.descripcion}</td>
                    <td>
                      <span style={{ fontSize: 10, color: LC[p.linea] ?? "#555", fontWeight: 600 }}>{p.linea}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: p.stock > 0 ? "#1A2E1A" : "#C0392B" }}>{p.stock}</td>
                    <td style={{ textAlign: "right", color: "#2D6A4F", fontWeight: 600 }}>{p.stock > 0 ? cajasLabel(p) : "—"}</td>
                    <td style={{ textAlign: "right" }}>{p.stock > 0 ? p.sueltas : "—"}</td>
                    <td style={{ textAlign: "center", color: "#9CA3AF" }}>
                      {p.upb} {p.tipo_envase === "plancha" ? "u/plancha" : "u/caja"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`${styles.pill} ${pill}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.footer}>
        Destilería Pachar &middot; Corte {data.periodo.hasta} &middot; 750ml y 375ml = 6 u/caja &middot; 50ml = 60 u/caja
        &middot; Matacuy 50ml = 111 u/plancha
      </div>
    </div>
  );
}

function DonutCard({ title, values }: { title: string; values: number[] }) {
  const entries = LN.map((l, i) => ({ l, v: values[i] })).filter((e) => e.v > 0);
  const labels = entries.map((e) => e.l);
  const vals = entries.map((e) => e.v);
  const colors = entries.map((e) => LC[e.l]);
  const total = vals.reduce((a, b) => a + b, 0);

  return (
    <div className={styles.card}>
      <div className={styles.cardT}>{title}</div>
      <div style={{ position: "relative", width: "100%", height: 230 }}>
        <Doughnut
          data={{ labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 3, borderColor: "#fff" }] }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "55%",
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatNum(ctx.raw as number)} u. (${total > 0 ? Math.round(((ctx.raw as number) / total) * 100) : 0}%)` } },
            },
          }}
          plugins={[createDonutPercentPlugin(vals, 6)]}
        />
      </div>
      <div className={styles.leg} style={{ justifyContent: "center", marginTop: 8 }}>
        {entries.map((e, i) => (
          <span key={e.l}>
            <span className={styles.lsq} style={{ background: colors[i] }} />
            {e.l} — {formatNum(e.v)} u. ({total > 0 ? Math.round((e.v / total) * 100) : 0}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function SalidasSection({ salidas }: { salidas: DashboardStockResponse["salidas"] }) {
  if (salidas.total === 0) {
    return (
      <div className={styles.card} style={{ marginBottom: 18, textAlign: "center", color: "#6B7280", fontSize: 12 }}>
        Todavía no hay salidas registradas en este período. Se van a mostrar acá a medida que se carguen movimientos de
        tipo "salida".
      </div>
    );
  }

  const destinos = salidas.por_destino.map((d) => d.destino);
  const destVals = salidas.por_destino.map((d) => d.total);
  const maxDest = Math.max(...destVals, 1);

  return (
    <div className={styles.threeCol}>
      <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className={styles.cardT}>Resumen de salidas del período</div>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".07em" }}>
            Total despachado
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0F6E56", lineHeight: 1.1 }}>{formatNum(salidas.total)}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>unidades en el período</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {salidas.por_destino.map((d, i) => {
            const pct = Math.round((d.total / salidas.total) * 100);
            const bw = Math.round((d.total / maxDest) * 100);
            return (
              <div key={d.destino} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 600, minWidth: 110, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.destino}
                </div>
                <div style={{ flex: 1, background: "#F0F4F0", borderRadius: 3, height: 12, overflow: "hidden" }}>
                  <div style={{ width: `${bw}%`, height: "100%", background: DEST_COLORS[i % DEST_COLORS.length], borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#374151", minWidth: 28, textAlign: "right" }}>{pct}%</div>
                <div style={{ fontSize: 9, color: "#9CA3AF", minWidth: 34, textAlign: "right" }}>{d.total}u</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardT}>Distribución por destino (%)</div>
        <div style={{ position: "relative", height: 190 }}>
          <Doughnut
            data={{ labels: destinos, datasets: [{ data: destVals, backgroundColor: DEST_COLORS, borderWidth: 3, borderColor: "#fff" }] }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "58%",
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} u (${Math.round(((ctx.raw as number) / salidas.total) * 100)}%)` } },
              },
            }}
            plugins={[createDonutPercentPlugin(destVals, 5)]}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
          {destinos.map((d, i) => (
            <span key={d} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#6B7280" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: DEST_COLORS[i % DEST_COLORS.length], display: "inline-block" }} />
              {d} {Math.round((destVals[i] / salidas.total) * 100)}%
            </span>
          ))}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardT}>Unidades despachadas por línea</div>
        <div style={{ position: "relative", height: 220 }}>
          <SalidasPorLineaChart porDestino={salidas.por_destino} />
        </div>
      </div>
    </div>
  );
}

const DEST_COLORS = ["#1A5276", "#C0392B", "#117A65", "#D4811A", "#6C3483", "#7D6608", "#2E86C1", "#A04000"];

function SalidasPorLineaChart({ porDestino }: { porDestino: DashboardStockResponse["salidas"]["por_destino"] }) {
  const totals = new Map<string, number>();
  for (const d of porDestino) {
    for (const [linea, cantidad] of Object.entries(d.por_linea)) {
      totals.set(linea, (totals.get(linea) ?? 0) + cantidad);
    }
  }
  const pairs = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Bar
      data={{
        labels: pairs.map(([l]) => l),
        datasets: [{ data: pairs.map(([, v]) => v), backgroundColor: pairs.map(([l]) => LC[l] ?? "#9CA3AF"), borderWidth: 0 }],
      }}
      options={{
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} unidades` } } },
        scales: { x: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } },
      }}
    />
  );
}
