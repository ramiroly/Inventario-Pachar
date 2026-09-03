import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

export const movimientosRouter = Router();

const movimientoSchema = z
  .object({
    producto_id: z.string().uuid(),
    fecha: z.string().date(),
    tipo: z.enum(["entrada", "salida"]),
    cantidad: z.number().int().positive(),
    destino: z.string().min(1).nullish(),
  })
  .refine((m) => m.tipo === "salida" || !m.destino, {
    message: "destino solo aplica a movimientos de tipo salida",
    path: ["destino"],
  });

movimientosRouter.get("/", requireRole("socio"), async (req, res) => {
  const { producto_id, desde, hasta } = req.query;
  let query = supabase.from("movimientos_terminados").select("*").order("fecha", { ascending: false });

  if (typeof producto_id === "string") query = query.eq("producto_id", producto_id);
  if (typeof desde === "string") query = query.gte("fecha", desde);
  if (typeof hasta === "string") query = query.lte("fecha", hasta);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

movimientosRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = movimientoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("movimientos_terminados")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
