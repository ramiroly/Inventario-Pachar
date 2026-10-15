import type { Formato, TipoEnvase } from "../types/models";

export interface ItemReporteStock {
  producto_id: string;
  descripcion: string;
  formato: Formato;
  upb: number;
  tipo_envase: TipoEnvase;
  es_exportacion: boolean;
  stock: number;
}

export interface LineaReporteStock {
  linea_id: string;
  nombre: string;
  color_dark: string | null;
  items: ItemReporteStock[];
}

export interface ReporteStock {
  lineas: LineaReporteStock[];
  total_unidades: number;
}

export interface CorteStockResumen {
  id: string;
  token: string;
  fecha: string;
  nota: string | null;
  total_unidades: number;
  created_at: string;
}

// Lo que devuelve el link publico de un corte guardado.
export interface CorteStockPublico {
  fecha: string;
  nota: string | null;
  total_unidades: number;
  created_at: string;
  datos: ReporteStock;
}

export const formatoUnidades = (n: number) => n.toLocaleString("es-PE");

// "15/10/2026, 14:30" en hora de Peru, sin importar la zona del navegador.
export function fechaHoraLima(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function presentacion(i: ItemReporteStock): string {
  if (i.tipo_envase === "unidad") return "Unidad";
  return `${i.upb} u/${i.tipo_envase}`;
}

export function desglose(i: ItemReporteStock): { bultos: number; sueltas: number } {
  if (i.tipo_envase === "unidad" || i.stock <= 0) return { bultos: 0, sueltas: 0 };
  return { bultos: Math.floor(i.stock / i.upb), sueltas: i.stock % i.upb };
}

export function urlCorte(token: string): string {
  return `${window.location.origin}/corte/${token}`;
}

function nombreArchivo(fecha: string): string {
  return `stock-terminados-${fecha}.xlsx`;
}

/** Descarga el reporte como Excel. `titulo` va en la primera fila. */
export async function descargarExcel(reporte: ReporteStock, titulo: string, fecha: string): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Stock actual");
  hoja.columns = [
    { width: 16 },
    { width: 34 },
    { width: 16 },
    { width: 18 },
    { width: 10 },
    { width: 14 },
  ];

  hoja.addRow([titulo]).font = { bold: true, size: 14 };
  hoja.addRow([]);
  const cab = hoja.addRow(["Línea", "Producto", "Presentación", "Cajas / planchas", "Sueltas", "Total (u.)"]);
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
  });

  for (const linea of reporte.lineas) {
    for (const i of linea.items) {
      const { bultos, sueltas } = desglose(i);
      const fila = hoja.addRow([
        linea.nombre,
        i.descripcion,
        presentacion(i),
        i.tipo_envase === "unidad" ? "" : i.stock > 0 ? bultos : 0,
        i.tipo_envase === "unidad" ? "" : i.stock > 0 ? sueltas : 0,
        i.stock,
      ]);
      if (i.stock <= 0) fila.font = { color: { argb: "FF9A9A90" } };
    }
    const sub = hoja.addRow([`Total ${linea.nombre}`, "", "", "", "", linea.items.reduce((a, i) => a + i.stock, 0)]);
    sub.font = { bold: true };
    sub.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDE5" } };
    });
  }
  const total = hoja.addRow(["TOTAL GENERAL", "", "", "", "", reporte.total_unidades]);
  total.font = { bold: true };
  hoja.getColumn(6).numFmt = "#,##0";
  hoja.views = [{ state: "frozen", ySplit: 3 }];

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo(fecha);
  a.click();
  URL.revokeObjectURL(url);
}
