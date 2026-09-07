import type { Plugin } from "chart.js";

/**
 * Porteo directo del plugin `dlP` (data labels sobre barras) de los
 * dashboards HTML originales. Se pasa por-instancia via el prop `plugins`
 * de react-chartjs-2 (no con Chart.register global), para que cada
 * dashboard pueda tener su propia variante de estilo sin pisarse entre sí.
 */
export function createBarDataLabelsPlugin(opts?: {
  font?: string;
  strokeStyle?: string;
  lineWidth?: number;
  minHeight?: number;
}): Plugin<"bar"> {
  const font = opts?.font ?? "800 13px 'Segoe UI',Arial";
  const strokeStyle = opts?.strokeStyle ?? "rgba(0,0,0,0.75)";
  const lineWidth = opts?.lineWidth ?? 4;
  const minHeight = opts?.minHeight ?? 10;

  return {
    id: "barDataLabels",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((ds, di) => {
        if ((ds as { type?: string }).type === "line") return;
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((el, i) => {
          const val = ds.data[i] as number | null | undefined;
          const height = (el as unknown as { height?: number }).height ?? 0;
          if (val === null || val === undefined || val === 0 || height < minHeight) return;
          ctx.save();
          ctx.font = font;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const pos = el.tooltipPosition(true);
          const x = pos.x ?? 0;
          const y = pos.y ?? 0;
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.lineJoin = "round";
          ctx.strokeText(String(val), x, y);
          ctx.fillStyle = "#fff";
          ctx.fillText(String(val), x, y);
          ctx.restore();
        });
      });
    },
  };
}

/**
 * Porteo directo del plugin de porcentaje sobre donut/doughnut usado en
 * los 3 dashboards originales (dibuja "NN%" en el medio de cada arco).
 */
export function createDonutPercentPlugin(values: number[], minPct = 5): Plugin<"doughnut"> {
  const total = values.reduce((a, b) => a + b, 0);
  return {
    id: "donutPercent",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.getDatasetMeta(0).data.forEach((arc, i) => {
        const a = arc as unknown as {
          startAngle: number;
          endAngle: number;
          outerRadius: number;
          innerRadius: number;
          x: number;
          y: number;
        };
        const mid = a.startAngle + (a.endAngle - a.startAngle) / 2;
        const r = (a.outerRadius + a.innerRadius) / 2;
        const x = a.x + Math.cos(mid) * r;
        const y = a.y + Math.sin(mid) * r;
        const pct = total > 0 ? Math.round((values[i] / total) * 100) : 0;
        if (pct < minPct) return;
        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.font = "700 10px 'Segoe UI',Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText(pct + "%", x, y);
        ctx.fillStyle = "#fff";
        ctx.fillText(pct + "%", x, y);
        ctx.restore();
      });
    },
  };
}
