import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";

export const snapshotsRouter = Router();

const snapshotSchema = z.object({
  tanque_id: z.string().uuid(),
  fecha_corte: z.string().date(),
  litros: z.number().min(0),
});

snapshotsRouter.get("/", requireRole("socio"), async (req, res) => {
  const { tanque_id } = req.query;
  let query = supabase
    .from("stock_liquidos_snapshot")
    .select("*")
    .order("fecha_corte", { ascending: false });
  if (typeof tanque_id === "string") query = query.eq("tanque_id", tanque_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

snapshotsRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = snapshotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // upsert: un snapshot por (tanque_id, fecha_corte) — ver constraint unique en la migración.
  const { data, error } = await supabase
    .from("stock_liquidos_snapshot")
    .upsert(parsed.data, { onConflict: "tanque_id,fecha_corte" })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
