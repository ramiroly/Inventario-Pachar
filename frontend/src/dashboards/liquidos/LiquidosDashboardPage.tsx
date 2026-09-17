import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { api } from "../../lib/api";
import type { DashboardLiquidosResponse, LineaLiquidos, TanqueDashboard, TanqueTerminadoDashboard } from "../../types/models";
import { createDonutPercentPlugin } from "../shared/chartPlugins";
import { useFloatingTooltip } from "../shared/useFloatingTooltip";
import { formatNum } from "../shared/format";
import { TankSvg } from "./TankSvg";
import styles from "./liquidos.module.css";

// Orden fijo de líneas de INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html (distinto
// del orden usado en Stock/Comparativo — cada dashboard original tenía el suyo).
const LN = ["Matacuy", "Salqa Azul", "Salqa Verde", "Añejo", "Reposado", "Cosecha", "Botanizado", "Licor de Café"];
const COLOR_ANTERIOR_CHART = "#A7D7C5";

// Réplica exacta de bSty/bLbl del HTML original (colores inline por umbral
// de ocupación, usados en las tarjetas de tanque).
function badgeInline(litros: number, cap: number | null): { style: React.CSSProperties; label: string } {
  if (!cap || cap <= 0) return { style: { background: "#FEE2E2", color: "#991B1B" }, label: "Vacío" };
  const p = litros / cap;
  if (p <= 0) return { style: { background: "#FEE2E2", color: "#991B1B" }, label: "Vacío" };
  if (p < 0.5) return { style: { background: "#FEF3C7", color: "#92400E" }, label: p < 0.2 ? "Bajo" : "Medio" };
  if (p < 0.8) return { style: { background: "#D1FAE5", color: "#065F46" }, label: "Bien" };
  return { style: { background: "#D1FAE5", color: "#065F46" }, label: "Alto" };
}

export function LiquidosDashboardPage() {
  const [data, setData] = useState<DashboardLiquidosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tooltip = useFloatingTooltip(styles.tooltipBox);

  useEffect(() => {
    api
      .get<DashboardLiquidosResponse>("/dashboards/liquidos")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const porNombre = new Map(data.lineas.map((l) => [l.nombre, l]));
    const ordenadas = LN.map((n) => porNombre.get(n)).filter((l): l is LineaLiquidos => !!l);
    const conTerminado = ordenadas.filter((l) => l.terminado);

    const totalTerm = conTerminado.reduce((a, l) => a + (l.terminado?.litros_actual ?? 0), 0);
    const totalPrev = conTerminado.reduce((a, l) => a + (l.terminado?.litros_anterior ?? 0), 0);
    const netDelta = totalTerm - totalPrev;

    const topLinea = [...conTerminado].sort((a, b) => (b.terminado?.litros_actual ?? 0) - (a.terminado?.litros_actual ?? 0))[0];
    const ocupProm = conTerminado.length
      ? Math.round(
          conTerminado.reduce((a, l) => {
            const t = l.terminado!;
            return a + (t.capacidad_litros ? (t.litros_actual / t.capacidad_litros) * 100 : 0);
          }, 0) / conTerminado.length
        )
      : 0;
    const sorted = [...conTerminado].sort((a, b) => b.terminado!.delta - a.terminado!.delta);
    const maxUp = sorted[0];
    const maxDown = [...conTerminado].filter((l) => l.terminado!.delta < 0).sort((a, b) => a.terminado!.delta - b.terminado!.delta)[0];
    const lineasActivas = conTerminado.filter((l) => (l.terminado?.litros_actual ?? 0) > 0).length;

    return { ordenadas, conTerminado, totalTerm, totalPrev, netDelta, topLinea, ocupProm, maxUp, maxDown, lineasActivas };
  }, [data]);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data || !computed) return <p>Cargando...</p>;

  const { ordenadas, conTerminado, totalTerm, totalPrev, netDelta, topLinea, ocupProm, maxUp, maxDown, lineasActivas } = computed;

  const alertItems: Array<{ text: string; className: string }> = [];
  for (const l of conTerminado) {
    const t = l.terminado!;
    if (t.litros_anterior === 0 && t.litros_actual > 0) {
      alertItems.push({ text: `Nuevo lote: ${t.lote} (${formatNum(t.litros_actual)} L)`, className: styles.atagBlue });
    } else if (t.delta > 100) {
      alertItems.push({ text: `Subió: ${l.nombre} +${formatNum(t.delta)} L`, className: styles.atagGreen });
    } else if (t.delta < -100) {
      alertItems.push({ text: `Bajó: ${l.nombre} ${formatNum(t.delta)} L`, className: styles.atagRed });
    }
  }
  for (const l of ordenadas) {
    for (const s of l.subs) {
      if (s.litros_anterior === 0 && s.litros_actual > 0) {
        alertItems.push({ text: `Nuevo sub: ${s.nombre} (${formatNum(s.litros_actual)} L)`, className: styles.atagBlue });
      }
    }
    const t = l.terminado;
    if (t && t.litros_actual > 0 && t.capacidad_litros && t.litros_actual / t.capacidad_litros < 0.1) {
      alertItems.push({ text: `Bajo: ${t.lote} (${formatNum(t.litros_actual)} L)`, className: styles.atagAmber });
    }
  }

  const donutEntries = conTerminado.filter((l) => (l.terminado?.litros_actual ?? 0) > 0);
  const donutLabels = donutEntries.map((l) => l.nombre);
  const donutVals = donutEntries.map((l) => l.terminado!.litros_actual);
  const donutColors = donutEntries.map((l) => l.color_dark ?? "#555");
  const donutTotal = donutVals.reduce((a, b) => a + b, 0);

  const compAnterior = ordenadas.map((l) => l.terminado?.litros_anterior ?? 0);
  const compActual = ordenadas.map((l) => l.terminado?.litros_actual ?? 0);
  const deltaVals = ordenadas.map((l) => l.terminado?.delta ?? 0);

  const ttTerm = (t: TanqueTerminadoDashboard) => {
    const isNew = t.litros_anterior === 0 && t.litros_actual > 0;
    const dCls = isNew ? styles.fttNew : t.delta > 0 ? styles.fttUp : t.delta < 0 ? styles.fttDown : "";
    const dTxt = isNew ? "Nuevo lote" : `${t.delta >= 0 ? "+" : ""}${formatNum(t.delta)} L`;
    return (
      <>
        <div className={styles.fttTitle}>{t.nombre}</div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Stock {data.fecha_corte}</span>
          <span className={styles.fttVal}>{formatNum(t.litros_actual)} L</span>
        </div>
        {t.litros_anterior > 0 && (
          <div className={styles.fttRow}>
            <span className={styles.fttLbl}>Stock {data.fecha_corte_anterior}</span>
            <span className={styles.fttVal} style={{ opacity: 0.7 }}>
              {formatNum(t.litros_anterior)} L
            </span>
          </div>
        )}
        <div className={styles.fttDiv} />
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Variación</span>
          <span className={`${styles.fttVal} ${dCls}`}>{dTxt}</span>
        </div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Capacidad</span>
          <span className={styles.fttVal}>{formatNum(t.capacidad_litros ?? 0)} L</span>
        </div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Nivel actual</span>
          <span className={styles.fttVal}>{t.capacidad_litros ? Math.round((t.litros_actual / t.capacidad_litros) * 100) : 0}%</span>
        </div>
      </>
    );
  };

  const ttSub = (s: TanqueDashboard) => {
    const isNew = s.litros_anterior === 0 && s.litros_actual > 0;
    const dCls = isNew ? styles.fttNew : s.delta > 0 ? styles.fttUp : s.delta < 0 ? styles.fttDown : "";
    const dTxt = isNew ? "Nuevo" : `${s.delta >= 0 ? "+" : ""}${formatNum(s.delta)} L`;
    return (
      <>
        <div className={styles.fttTitle}>
          {isNew ? "(Nuevo) " : ""}
          {s.nombre}
        </div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Stock {data.fecha_corte}</span>
          <span className={styles.fttVal}>{formatNum(s.litros_actual)} L</span>
        </div>
        {!isNew && s.litros_anterior > 0 && (
          <div className={styles.fttRow}>
            <span className={styles.fttLbl}>Stock {data.fecha_corte_anterior}</span>
            <span className={styles.fttVal} style={{ opacity: 0.7 }}>
              {formatNum(s.litros_anterior)} L
            </span>
          </div>
        )}
        <div className={styles.fttDiv} />
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Variación</span>
          <span className={`${styles.fttVal} ${dCls}`}>{dTxt}</span>
        </div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Capacidad</span>
          <span className={styles.fttVal}>{formatNum(s.capacidad_litros ?? 0)} L</span>
        </div>
        <div className={styles.fttRow}>
          <span className={styles.fttLbl}>Nivel actual</span>
          <span className={styles.fttVal}>{s.capacidad_litros ? Math.round((s.litros_actual / s.capacidad_litros) * 100) : 0}%</span>
        </div>
      </>
    );
  };

  return (
    <div className={styles.page}>
      {tooltip.tooltip}
      <div className={styles.hdr}>
        <div>
          <h1>Dashboard — Stock de Líquidos</h1>
          <p>
            Destilería Pachar &middot; Corte: {data.fecha_corte} &middot; Comparativa vs {data.fecha_corte_anterior}{" "}
            &middot; Uso interno
          </p>
        </div>
        <div className={styles.badges}>
          <div className={`${styles.badge} ${styles.badgeOk}`}>
            <strong>{formatNum(totalTerm)} L</strong>
            <span>Litros terminados</span>
          </div>
          <div className={styles.badge}>
            <strong>{formatNum(totalPrev)} L</strong>
            <span>Litros {data.fecha_corte_anterior}</span>
          </div>
          <div className={`${styles.badge} ${netDelta >= 0 ? styles.badgeUp : styles.badgeDown}`}>
            <strong>
              {netDelta >= 0 ? "+" : ""}
              {formatNum(netDelta)} L
            </strong>
            <span>Variación neta</span>
          </div>
          <div className={styles.badge}>
            <strong>{lineasActivas}</strong>
            <span>Líneas activas</span>
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.kgrid} style={{ paddingTop: 4 }}>
          <div className={`${styles.kpi} ${styles.kpiGrn}`}>
            <div className={styles.kl}>Total terminados</div>
            <div className={`${styles.kv} ${styles.kvGrn}`}>{formatNum(totalTerm)}</div>
            <div className={styles.kd}>litros en planta &mdash; {data.fecha_corte}</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiBlu}`}>
            <div className={styles.kl}>Línea dominante</div>
            <div className={`${styles.kv} ${styles.kvBlu}`} style={{ fontSize: 14 }}>
              {topLinea?.nombre ?? "-"}
            </div>
            <div className={styles.kd}>{formatNum(topLinea?.terminado?.litros_actual ?? 0)} L</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiAmb}`}>
            <div className={styles.kl}>Ocupación promedio</div>
            <div className={`${styles.kv} ${styles.kvAmb}`}>{ocupProm}%</div>
            <div className={styles.kd}>de tanques terminados</div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiGrn}`}>
            <div className={styles.kl}>Mayor incremento</div>
            <div className={`${styles.kv} ${styles.kvGrn}`} style={{ fontSize: 13 }}>
              {maxUp?.nombre ?? "--"}
            </div>
            <div className={styles.kd}>
              {maxUp
                ? `${formatNum(maxUp.terminado!.litros_anterior)} a ${formatNum(maxUp.terminado!.litros_actual)} L (${maxUp.terminado!.delta >= 0 ? "+" : ""}${formatNum(maxUp.terminado!.delta)} L)`
                : ""}
            </div>
          </div>
          <div className={`${styles.kpi} ${styles.kpiRed}`}>
            <div className={styles.kl}>Mayor descenso</div>
            <div className={`${styles.kv} ${styles.kvRed}`} style={{ fontSize: 13 }}>
              {maxDown?.nombre ?? "--"}
            </div>
            <div className={styles.kd}>
              {maxDown
                ? `${formatNum(maxDown.terminado!.litros_anterior)} a ${formatNum(maxDown.terminado!.litros_actual)} L (${formatNum(maxDown.terminado!.delta)} L)`
                : ""}
            </div>
          </div>
        </div>

        {alertItems.length > 0 && (
          <div className={styles.alertBar}>
            <strong>
              Estado del inventario &mdash; {data.fecha_corte} vs {data.fecha_corte_anterior}
            </strong>
            <div className={styles.alertTags}>
              {alertItems.map((a, i) => (
                <span key={i} className={`${styles.atag} ${a.className}`}>
                  {a.text}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.donutKpi}>
          <div style={{ flexShrink: 0, position: "relative", width: 180, height: 180 }}>
            <Doughnut
              data={{ labels: donutLabels, datasets: [{ data: donutVals, backgroundColor: donutColors, borderWidth: 3, borderColor: "#fff" }] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatNum(ctx.raw as number)} L (${donutTotal > 0 ? Math.round(((ctx.raw as number) / donutTotal) * 100) : 0}%)` } },
                },
              }}
              plugins={[createDonutPercentPlugin(donutVals, 5)]}
            />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Total</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>{formatNum(donutTotal)}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF" }}>litros</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {donutEntries.map((l, i) => {
              const pct = donutTotal > 0 ? Math.round((donutVals[i] / donutTotal) * 100) : 0;
              return (
                <div key={l.linea_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: donutColors[i] }} />
                  <div style={{ fontSize: 11, color: "#374151", flex: 1, fontWeight: 500 }}>{l.nombre}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", minWidth: 65, textAlign: "right" }}>{formatNum(donutVals[i])} L</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: donutColors[i], minWidth: 36, textAlign: "right" }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className={styles.sec}>
          Tanques por línea &mdash; nivel actual (oscuro) vs {data.fecha_corte_anterior} (claro) &middot; Pasa el
          cursor sobre cada tanque para ver el detalle
        </p>
        <div>
          {ordenadas.map((l) => (
            <LineaSection key={l.linea_id} linea={l} tooltip={tooltip} ttTerm={ttTerm} ttSub={ttSub} badgeInline={badgeInline} />
          ))}
        </div>

        <p className={styles.sec}>
          Comparativa semanal &mdash; terminados {data.fecha_corte_anterior} vs {data.fecha_corte}
        </p>
        <div className={styles.g2}>
          <div className={styles.card}>
            <div className={styles.cardT}>
              Litros por línea &mdash; {data.fecha_corte_anterior} vs {data.fecha_corte} (solo terminados)
            </div>
            <div className={styles.leg}>
              <span>
                <span className={styles.lsq} style={{ background: COLOR_ANTERIOR_CHART }} />
                {data.fecha_corte_anterior}
              </span>
              <span>
                <span className={styles.lsq} style={{ background: "#0F6E56" }} />
                {data.fecha_corte}
              </span>
            </div>
            <div style={{ position: "relative", height: 240 }}>
              <Bar
                data={{
                  labels: ordenadas.map((l) => l.nombre),
                  datasets: [
                    { label: data.fecha_corte_anterior ?? "", data: compAnterior, backgroundColor: COLOR_ANTERIOR_CHART, borderWidth: 0 },
                    { label: data.fecha_corte ?? "", data: compActual, backgroundColor: ordenadas.map((l) => l.color_dark ?? "#555"), borderWidth: 0 },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top", labels: { font: { size: 10 }, boxWidth: 10 } },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatNum(ctx.raw as number)} L` } },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 30 } },
                    y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { font: { size: 10 }, callback: (v) => `${v} L` } },
                  },
                }}
              />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardT}>
              Variación neta por tanque terminado ({data.fecha_corte_anterior} &rarr; {data.fecha_corte})
            </div>
            <div style={{ position: "relative", height: 240 }}>
              <Bar
                data={{
                  labels: ordenadas.map((l) => l.nombre),
                  datasets: [
                    {
                      data: deltaVals,
                      backgroundColor: deltaVals.map((v) => (v > 0 ? "#0F6E56" : v < 0 ? "#C0392B" : "#9CA3AF")),
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number) >= 0 ? "+" : ""}${ctx.raw} L` } },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 30 } },
                    y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { font: { size: 10 }, callback: (v) => `${v} L` } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        Destilería Pachar &middot; Líquidos {data.fecha_corte} &middot; Nivel claro = {data.fecha_corte_anterior}{" "}
        &middot; Nivel oscuro = {data.fecha_corte} &middot; Uso interno
      </div>
    </div>
  );
}

function LineaSection({
  linea,
  tooltip,
  ttTerm,
  ttSub,
  badgeInline,
}: {
  linea: LineaLiquidos;
  tooltip: ReturnType<typeof useFloatingTooltip>;
  ttTerm: (t: TanqueTerminadoDashboard) => React.ReactNode;
  ttSub: (s: TanqueDashboard) => React.ReactNode;
  badgeInline: (litros: number, cap: number | null) => { style: React.CSSProperties; label: string };
}) {
  const col = linea.color_dark ?? "#555";
  const colLt = linea.color_light ?? "#ddd";
  const colS = linea.color_sub ?? "#777";
  const t = linea.terminado;
  const subs = linea.subs;

  return (
    <div className={styles.lineaSection}>
      <div className={styles.lineaHdr} style={{ background: col }}>
        <span className={styles.lineaHdrTitle}>{linea.nombre}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.75)", marginLeft: "auto" }}>
          Terminado: {formatNum(t?.litros_actual ?? 0)} L
          {t && t.litros_anterior === 0 && t.litros_actual > 0 ? " · Lote nuevo" : ""}
          {subs.length ? ` · ${subs.length} subproducto${subs.length > 1 ? "s" : ""}` : ""}
        </span>
      </div>
      <div className={styles.lineaBody}>
        <div className={styles.tankGroupRow}>
          <div>
            <div className={styles.subLabel}>Terminado</div>
            <div style={{ display: "flex" }}>
              {t ? (
                <div
                  className={styles.tankCard}
                  onMouseEnter={() => tooltip.show(ttTerm(t))}
                  onMouseLeave={() => tooltip.hide()}
                >
                  <div className={styles.tankName} style={{ maxWidth: 72 }}>
                    {t.lote}
                    {t.litros_anterior === 0 && t.litros_actual > 0 ? " *" : ""}
                  </div>
                  <TankSvg litros={t.litros_actual} prev={t.litros_anterior > 0 ? t.litros_anterior : null} cap={t.capacidad_litros} colorDark={col} colorLight={colLt} width={64} height={130} />
                  <div className={styles.tankLitros}>{formatNum(t.litros_actual)} L</div>
                  <div className={styles.tankCap}>/ {formatNum(t.capacidad_litros ?? 0)} L</div>
                  <div className={styles.tankBadge} style={badgeInline(t.litros_actual, t.capacidad_litros).style}>
                    {badgeInline(t.litros_actual, t.capacidad_litros).label}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>Sin tanque terminado</div>
              )}
            </div>
          </div>
          {subs.length > 0 && (
            <>
              <div className={styles.tankGroupSep} />
              <div style={{ flex: 1 }}>
                <div className={styles.subLabel}>Subproductos</div>
                <div className={styles.subTanks}>
                  {subs.map((s) => {
                    const isNew = s.litros_anterior === 0 && s.litros_actual > 0;
                    const shortN = s.nombre.length > 20 ? `${s.nombre.slice(0, 19)}...` : s.nombre;
                    return (
                      <div key={s.tanque_id} className={styles.tankCard} onMouseEnter={() => tooltip.show(ttSub(s))} onMouseLeave={() => tooltip.hide()}>
                        <div className={styles.tankName} style={{ maxWidth: 54, fontSize: 8 }}>
                          {isNew ? "* " : ""}
                          {shortN}
                        </div>
                        <TankSvg litros={s.litros_actual} prev={s.litros_anterior > 0 ? s.litros_anterior : null} cap={s.capacidad_litros} colorDark={colS} colorLight={colLt} width={46} height={96} />
                        <div className={styles.tankLitros} style={{ fontSize: 10 }}>
                          {formatNum(s.litros_actual)} L
                        </div>
                        <div className={styles.tankCap}>/ {formatNum(s.capacidad_litros ?? 0)} L</div>
                        <div className={styles.tankBadge} style={{ ...badgeInline(s.litros_actual, s.capacidad_litros).style, fontSize: 7 }}>
                          {badgeInline(s.litros_actual, s.capacidad_litros).label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
