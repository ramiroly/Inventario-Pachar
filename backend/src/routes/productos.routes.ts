import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

export const productosRouter = Router();

const productoSchema = z.object({
  linea_id: z.string().uuid(),
  descripcion: z.string().min(1),
  formato: z.union([z.literal(750), z.literal(700), z.literal(375), z.literal(50)]),
  upb: z.number().int().positive(),
  tipo_envase: z.enum(["caja", "plancha"]),
  es_exportacion: z.boolean().default(false),
});

productosRouter.get("/", requireRole("socio"), async (req, res) => {
  const { linea_id } = req.query;
  let query = supabase.from("productos_terminados").select("*");
  if (typeof linea_id === "string") query = query.eq("linea_id", linea_id);

  const { data, error } = await query.order("descripcion");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

productosRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = productoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("productos_terminados")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

productosRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = productoSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("productos_terminados")
    .update(parsed.data)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
