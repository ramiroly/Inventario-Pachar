import { Router } from "express";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

export const lineasRouter = Router();

lineasRouter.get("/", requireRole("socio"), async (_req, res) => {
  const { data, error } = await supabase.from("lineas").select("*").order("nombre");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

lineasRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { color_dark, color_light, color_sub } = req.body ?? {};
  const { data, error } = await supabase
    .from("lineas")
    .update({ color_dark, color_light, color_sub })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
