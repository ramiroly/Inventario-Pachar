import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

export const tanquesRouter = Router();

const tanqueSchema = z.object({
  linea_id: z.string().uuid(),
  nombre: z.string().min(1),
  tipo: z.enum(["terminado", "subproducto"]),
  // null = capacidad sin confirmar (ver TODO en 004_tanques_liquidos.sql)
  capacidad_litros: z.number().positive().nullable(),
  lote: z.string().nullish(),
});

tanquesRouter.get("/", requireRole("socio"), async (req, res) => {
  const { linea_id } = req.query;
  let query = supabase.from("tanques_liquidos").select("*");
  if (typeof linea_id === "string") query = query.eq("linea_id", linea_id);

  const { data, error } = await query.order("nombre");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

tanquesRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = tanqueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase.from("tanques_liquidos").insert(parsed.data).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

tanquesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = tanqueSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from("tanques_liquidos")
    .update(parsed.data)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
