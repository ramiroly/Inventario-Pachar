import { supabase } from "../config/supabaseClient.js";
import type { MovimientoTerminado } from "../types/models.js";
import { fetchAll } from "./fetchAll.js";

/**
 * Todos los movimientos de productos terminados (sin el corte de 1000 filas de
 * Supabase). Con la misma forma { data, error } que una consulta normal, para
 * poder usarla donde antes se hacia supabase.from(...).select("*").
 */
export async function todosLosMovimientosTerminados(): Promise<{
  data: MovimientoTerminado[] | null;
  error: { message: string } | null;
}> {
  try {
    const data = await fetchAll<MovimientoTerminado>((a, b) =>
      supabase.from("movimientos_terminados").select("*").order("fecha").order("id").range(a, b)
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
}
