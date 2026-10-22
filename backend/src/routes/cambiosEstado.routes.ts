import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

// Cambios de estado de un lote de liquido (en proceso, en reposo, terminado/aprobado).
export const cambiosEstadoRouter = Router();

const hoyUtc = () => new Date().toISOString().slice(0, 10);

const cambioSchema = z.object({
  tanque_id: z.string().uuid(),
  estado: z.enum(["proceso", "reposo", "terminado"]),
  fecha: z.string().date(),
  nota: z.string().trim().max(200).nullish(),
});

cambiosEstadoRouter.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("cambios_estado_lote")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

cambiosEstadoRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = cambioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const c = parsed.data;
  if (c.fecha > hoyUtc()) return res.status(400).json({ error: "La fecha no puede ser futura." });

  const { data: tanque } = await supabase
    .from("tanques_liquidos")
    .select("id, tipo, activo, estado, nombre")
    .eq("id", c.tanque_id)
    .single();
  if (!tanque || tanque.activo === false) {
    return res.status(400).json({ error: "El lote no existe o ya está marcado como terminado." });
  }
  if (tanque.tipo !== "terminado") return res.status(400).json({ error: "Solo los lotes tienen estado." });
  if (tanque.estado === c.estado) return res.status(400).json({ error: "El lote ya está en ese estado." });

  const { data: cambio, error } = await supabase
    .from("cambios_estado_lote")
    .insert({
      tanque_id: c.tanque_id,
      fecha: c.fecha,
      estado_anterior: tanque.estado,
      estado_nuevo: c.estado,
      nota: c.nota || null,
      created_by: req.userId,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const { error: errorTanque } = await supabase.from("tanques_liquidos").update({ estado: c.estado }).eq("id", c.tanque_id);
  if (errorTanque) {
    await supabase.from("cambios_estado_lote").delete().eq("id", cambio.id);
    return res.status(500).json({ error: errorTanque.message });
  }
  res.status(201).json(cambio);
});
