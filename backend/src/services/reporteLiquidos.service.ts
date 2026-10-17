import { supabase } from "../config/supabaseClient.js";
import { fetchAll } from "../db/fetchAll.js";
import { ordenLinea } from "./reporteStock.service.js";

export interface TanqueReporteLiquidos {
  tanque_id: string;
  nombre: string;
  lote: string | null;
  capacidad_litros: number | null;
  litros: number;
  // Litros que entraron (+) o salieron (-) por movimientos despues del ultimo corte.
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
  // Fecha de la ultima medicion (corte semanal) en la que se basa el reporte.
  fecha_ultimo_corte: string | null;
  lineas: LineaReporteLiquidos[];
  total_terminados: number;
  total_subproductos: number;
  total_litros: number;
}

const redondear = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Litros actuales de cada tanque vigente: ultimo corte medido mas los movimientos
 * posteriores (un movimiento con la misma fecha del corte se considera incluido).
 * Es el mismo calculo del dashboard de Liquidos.
 */
export async function reporteLiquidosActual(): Promise<ReporteLiquidos> {
  const [tanquesRes, snapshotsRes, lineasRes, movimientos] = await Promise.all([
    supabase.from("tanques_liquidos").select("*"),
    supabase.from("stock_liquidos_snapshot").select("*").order("fecha_corte", { ascending: false }),
    supabase.from("lineas").select("*"),
    fetchAll<{ tanque_id: string; fecha: string; tipo: string; litros: number; anulado: boolean }>((a, b) =>
      supabase.from("movimientos_liquidos").select("tanque_id, fecha, tipo, litros, anulado").order("fecha").order("id").range(a, b)
    ),
  ]);
  const error = tanquesRes.error ?? snapshotsRes.error ?? lineasRes.error;
  if (error) throw new Error(error.message);

  const baseDe = new Map<string, { fecha_corte: string; litros: number }>();
  let ultimoCorte: string | null = null;
  for (const s of snapshotsRes.data ?? []) {
    if (!baseDe.has(s.tanque_id)) baseDe.set(s.tanque_id, s); // vienen del corte mas nuevo al mas viejo
    if (!ultimoCorte || s.fecha_corte > ultimoCorte) ultimoCorte = s.fecha_corte;
  }
  const movsPorTanque = new Map<string, { fecha: string; firmado: number }[]>();
  for (const m of movimientos.filter((x) => !x.anulado)) {
    const lista = movsPorTanque.get(m.tanque_id) ?? [];
    lista.push({ fecha: m.fecha, firmado: (m.tipo === "ingreso" ? 1 : -1) * Number(m.litros) });
    movsPorTanque.set(m.tanque_id, lista);
  }

  const aReporte = (t: { id: string; nombre: string; lote: string | null; capacidad_litros: number | null }): TanqueReporteLiquidos => {
    const base = baseDe.get(t.id);
    const neto = (movsPorTanque.get(t.id) ?? []).filter((m) => !base || m.fecha > base.fecha_corte).reduce((a, m) => a + m.firmado, 0);
    return {
      tanque_id: t.id,
      nombre: t.nombre,
      lote: t.lote,
      capacidad_litros: t.capacidad_litros === null ? null : Number(t.capacidad_litros),
      litros: Math.max(0, redondear(Number(base?.litros ?? 0) + neto)),
      neto_desde_corte: redondear(neto),
    };
  };

  const activos = (tanquesRes.data ?? []).filter((t) => t.activo !== false);
  const lineas = (lineasRes.data ?? [])
    .sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre))
    .map((l): LineaReporteLiquidos => {
      const deLinea = activos.filter((t) => t.linea_id === l.id);
      return {
        linea_id: l.id,
        nombre: l.nombre,
        color_dark: l.color_dark,
        // lote mas nuevo primero, como en el dashboard
        terminados: deLinea
          .filter((t) => t.tipo === "terminado")
          .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.nombre.localeCompare(b.nombre, "es"))
          .map(aReporte),
        subs: deLinea
          .filter((t) => t.tipo === "subproducto")
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          .map(aReporte),
      };
    })
    .filter((l) => l.terminados.length > 0 || l.subs.length > 0);

  const suma = (ts: TanqueReporteLiquidos[]) => ts.reduce((a, t) => a + t.litros, 0);
  const total_terminados = redondear(lineas.reduce((a, l) => a + suma(l.terminados), 0));
  const total_subproductos = redondear(lineas.reduce((a, l) => a + suma(l.subs), 0));
  return {
    fecha_ultimo_corte: ultimoCorte,
    lineas,
    total_terminados,
    total_subproductos,
    total_litros: redondear(total_terminados + total_subproductos),
  };
}
