import { supabase } from "../config/supabaseClient.js";
import { todosLosMovimientosTerminados } from "../db/movimientosTerminados.js";
import type { Formato, Linea, ProductoTerminado, TipoEnvase } from "../types/models.js";

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

const ORDEN_LINEAS = ["Matacuy", "Salqa Azul", "Salqa Verde", "Añejo", "Reposado", "Cosecha", "Botanizado", "Licor de Café"];
const ordenLinea = (nombre: string) => {
  const i = ORDEN_LINEAS.indexOf(nombre);
  return i === -1 ? ORDEN_LINEAS.length : i;
};

// Dentro de cada linea: 750, 700, 375, 50, luego los de exportacion ("ingles") y por
// ultimo las garrafas.
function ordenProducto(p: ProductoTerminado): number {
  if (p.formato === 4000) return 5;
  if (p.es_exportacion) return 4;
  return { 750: 0, 700: 1, 375: 2, 50: 3 }[p.formato as 750 | 700 | 375 | 50] ?? 6;
}

/** Stock actual de TODOS los productos terminados, agrupado por linea. */
export async function reporteStockActual(): Promise<ReporteStock> {
  const [lineasRes, productosRes, movs] = await Promise.all([
    supabase.from("lineas").select("*"),
    supabase.from("productos_terminados").select("*"),
    todosLosMovimientosTerminados(),
  ]);
  if (lineasRes.error) throw new Error(lineasRes.error.message);
  if (productosRes.error) throw new Error(productosRes.error.message);
  if (movs.error || !movs.data) throw new Error(movs.error?.message ?? "No se pudieron leer los movimientos");

  const stock = new Map<string, number>();
  for (const m of movs.data) {
    if (m.anulado) continue;
    stock.set(m.producto_id, (stock.get(m.producto_id) ?? 0) + (m.tipo === "entrada" ? 1 : -1) * m.cantidad);
  }

  const productos = productosRes.data as ProductoTerminado[];
  const lineas = (lineasRes.data as Linea[])
    .sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre))
    .map((linea): LineaReporteStock => ({
      linea_id: linea.id,
      nombre: linea.nombre,
      color_dark: linea.color_dark,
      items: productos
        .filter((p) => p.linea_id === linea.id)
        .sort((a, b) => ordenProducto(a) - ordenProducto(b) || a.descripcion.localeCompare(b.descripcion, "es"))
        .map((p) => ({
          producto_id: p.id,
          descripcion: p.descripcion,
          formato: p.formato,
          upb: p.upb,
          tipo_envase: p.tipo_envase,
          es_exportacion: p.es_exportacion,
          stock: stock.get(p.id) ?? 0,
        })),
    }))
    .filter((l) => l.items.length > 0);

  const total_unidades = lineas.reduce((acc, l) => acc + l.items.reduce((a, i) => a + i.stock, 0), 0);
  return { lineas, total_unidades };
}
