import type { EstadoLote } from "../types/models";

export interface TanqueReporteLiquidos {
  tanque_id: string;
  nombre: string;
  lote: string | null;
  // Solo los lotes tienen estado. Cortes guardados antes de esta funcion no lo traen: cuentan como terminados.
  estado?: EstadoLote | null;
  capacidad_litros: number | null;
  litros: number;
  neto_desde_corte: number;
}

export interface LineaReporteLiquidos {
  linea_id: string;
  nombre: string;
  color_dark: string | null;
  terminados: TanqueReporteLiquidos[];
  subs: TanqueReporteLiquidos[];
}

export interface ReporteLiquidos {
  fecha_ultimo_corte: string | null;
  lineas: LineaReporteLiquidos[];
  total_terminados: number;
  total_en_preparacion?: number;
  total_subproductos: number;
  total_litros: number;
}

export interface CorteLiquidosResumen {
  id: string;
  token: string;
  fecha: string;
  nota: string | null;
  total_litros: number;
  created_at: string;
}

// Lo que devuelve el link publico de un corte de liquidos guardado.
export interface CorteLiquidosPublico {
  fecha: string;
  nota: string | null;
  total_litros: number;
  created_at: string;
  datos: ReporteLiquidos;
}

export function urlCorteLiquidos(token: string): string {
  return `${window.location.origin}/corte-liquidos/${token}`;
}

export function ocupacion(t: TanqueReporteLiquidos): number | null {
  return t.capacidad_litros && t.capacidad_litros > 0 ? Math.round((t.litros / t.capacidad_litros) * 100) : null;
}

const suma = (ts: TanqueReporteLiquidos[]) => ts.reduce((a, t) => a + t.litros, 0);
const aprobado = (t: TanqueReporteLiquidos) => !t.estado || t.estado === "terminado";
export const lotesAprobados = (l: LineaReporteLiquidos) => l.terminados.filter(aprobado);
export const lotesEnPreparacion = (l: LineaReporteLiquidos) => l.terminados.filter((t) => !aprobado(t));
export const litrosTerminados = (l: LineaReporteLiquidos) => suma(lotesAprobados(l));
export const litrosEnPreparacion = (l: LineaReporteLiquidos) => suma(lotesEnPreparacion(l));
export const litrosSubproductos = (l: LineaReporteLiquidos) => suma(l.subs);

/** Descarga el reporte de litros como Excel. `titulo` va en la primera fila. */
export async function descargarExcelLiquidos(reporte: ReporteLiquidos, titulo: string, fecha: string): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Stock de líquidos");
  hoja.columns = [{ width: 16 }, { width: 14 }, { width: 46 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 12 }];

  hoja.addRow([titulo]).font = { bold: true, size: 14 };
  hoja.addRow([]);
  const cab = hoja.addRow(["Línea", "Tipo", "Tanque", "Lote", "Capacidad (L)", "Litros", "Ocupación"]);
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
  });

  const relleno = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEDEDE5" } };
  for (const linea of reporte.lineas) {
    const filas: [string, TanqueReporteLiquidos][] = [
      ...linea.terminados.map((t): [string, TanqueReporteLiquidos] => [
        aprobado(t) ? "Terminado" : t.estado === "reposo" ? "En reposo" : "En proceso",
        t,
      ]),
      ...linea.subs.map((t): [string, TanqueReporteLiquidos] => ["Subproducto", t]),
    ];
    for (const [tipo, t] of filas) {
      const oc = ocupacion(t);
      const fila = hoja.addRow([linea.nombre, tipo, t.nombre, t.lote ?? "", t.capacidad_litros ?? "", t.litros, oc === null ? "" : oc / 100]);
      fila.getCell(7).numFmt = "0%";
      if (t.litros <= 0) fila.font = { color: { argb: "FF9A9A90" } };
    }
    const sub = hoja.addRow([`Total ${linea.nombre}`, "", `Terminado ${litrosTerminados(linea)} L · En preparación ${litrosEnPreparacion(linea)} L · Subproductos ${litrosSubproductos(linea)} L`, "", "", litrosTerminados(linea) + litrosEnPreparacion(linea) + litrosSubproductos(linea), ""]);
    sub.font = { bold: true };
    sub.eachCell((c) => {
      c.fill = relleno;
    });
  }
  hoja.addRow(["TOTAL TERMINADOS", "", "", "", "", reporte.total_terminados, ""]).font = { bold: true };
  hoja.addRow(["TOTAL EN PREPARACIÓN", "", "", "", "", reporte.total_en_preparacion ?? 0, ""]).font = { bold: true };
  hoja.addRow(["TOTAL SUBPRODUCTOS", "", "", "", "", reporte.total_subproductos, ""]).font = { bold: true };
  hoja.addRow(["TOTAL GENERAL", "", "", "", "", reporte.total_litros, ""]).font = { bold: true };
  hoja.getColumn(6).numFmt = "#,##0.###";
  hoja.getColumn(5).numFmt = "#,##0";
  hoja.views = [{ state: "frozen", ySplit: 3 }];

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-liquidos-${fecha}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
