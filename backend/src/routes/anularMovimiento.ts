import type { Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";

const idSchema = z.string().uuid();
const anularSchema = z.object({
  motivo: z.string().trim().min(3, "Escribe el motivo de la anulación").max(200),
});

/**
 * Anula un movimiento sin borrarlo: queda en el registro marcado como anulado
 * (con motivo, fecha y usuario) y deja de contar en stock, saldos y dashboards.
 */
export function anularMovimiento(tabla: "movimientos_terminados" | "movimientos_liquidos") {
  return async (req: Request, res: Response) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Movimiento no válido." });
    const cuerpo = anularSchema.safeParse(req.body);
    if (!cuerpo.success) return res.status(400).json({ error: cuerpo.error.flatten() });

    const { data: actual } = await supabase.from(tabla).select("id, anulado").eq("id", id.data).maybeSingle();
    if (!actual) return res.status(404).json({ error: "El movimiento no existe." });
    if (actual.anulado) return res.status(409).json({ error: "Ese movimiento ya está anulado." });

    const { data, error } = await supabase
      .from(tabla)
      .update({
        anulado: true,
        anulado_motivo: cuerpo.data.motivo,
        anulado_at: new Date().toISOString(),
        anulado_por: req.userId ?? null,
      })
      .eq("id", id.data)
      .eq("anulado", false)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(409).json({ error: "Ese movimiento ya está anulado." });
    res.json(data);
  };
}
