import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { fetchAll } from "../db/fetchAll.js";
import { requireRole } from "../middleware/requireRole.js";
import { anularMovimiento } from "./anularMovimiento.js";

export const movimientosRouter = Router();

const movimientoSchema = z
  .object({
    producto_id: z.string().uuid(),
    fecha: z.string().date(),
    tipo: z.enum(["entrada", "salida"]),
    cantidad: z.number().int().positive(),
    destino: z.string().min(1).nullish(),
    es_ajuste: z.boolean().default(false),
    motivo: z.string().trim().max(200).nullish(),
    numero_documento: z.string().trim().min(1).max(50).nullish(),
  })
  .refine((m) => m.tipo === "salida" || !m.destino, {
    message: "destino solo aplica a movimientos de tipo salida",
    path: ["destino"],
  })
  .refine((m) => !m.es_ajuste || !m.destino, {
    message: "un ajuste de inventario no lleva destino",
    path: ["destino"],
  })
  .refine((m) => m.es_ajuste || !m.motivo, {
    message: "el motivo solo aplica a ajustes de inventario",
    path: ["motivo"],
  })
  .refine((m) => !m.es_ajuste || !m.numero_documento, {
    message: "un ajuste usa motivo, no numero de documento",
    path: ["numero_documento"],
  });

movimientosRouter.get("/", requireRole("socio"), async (req, res) => {
  const { producto_id, desde, hasta } = req.query;
  try {
    const data = await fetchAll((a, b) => {
      let query = supabase.from("movimientos_terminados").select("*");
      if (typeof producto_id === "string") query = query.eq("producto_id", producto_id);
      if (typeof desde === "string") query = query.gte("fecha", desde);
      if (typeof hasta === "string") query = query.lte("fecha", hasta);
      return query.order("fecha", { ascending: false }).order("id").range(a, b);
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

movimientosRouter.patch("/:id/anular", requireRole("admin"), anularMovimiento("movimientos_terminados"));

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
