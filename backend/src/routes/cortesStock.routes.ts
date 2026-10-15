import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";
import { reporteStockActual } from "../services/reporteStock.service.js";

// Rutas con sesion (admin): ver el stock actual, guardar cortes y consultarlos.
export const cortesStockRouter = Router();

// Ruta publica (sin sesion): se entra con el token secreto del corte. Solo lectura.
export const cortesStockPublicoRouter = Router();

const COLUMNAS_LISTA = "id, token, fecha, nota, total_unidades, created_at";

// Fecha de hoy en Peru (UTC-5): el servidor corre en UTC y despues de las 7 pm
// toISOString ya marcaria el dia siguiente.
function hoyPeru(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

cortesStockRouter.get("/actual", requireRole("admin"), async (_req, res) => {
  try {
    res.json(await reporteStockActual());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

cortesStockRouter.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("cortes_stock_terminados")
    .select(COLUMNAS_LISTA)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

cortesStockRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = z.object({ nota: z.string().trim().max(200).nullish() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const reporte = await reporteStockActual();
    const { data, error } = await supabase
      .from("cortes_stock_terminados")
      .insert({
        token: randomBytes(16).toString("hex"),
        fecha: hoyPeru(),
        nota: parsed.data.nota || null,
        total_unidades: reporte.total_unidades,
        datos: reporte,
        created_by: req.userId,
      })
      .select(COLUMNAS_LISTA)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Retira un corte del listado y apaga su link publico (no se borra de la base).
cortesStockRouter.patch("/:id/retirar", requireRole("admin"), async (req, res) => {
  const { data, error } = await supabase
    .from("cortes_stock_terminados")
    .update({ activo: false })
    .eq("id", req.params.id)
    .select("id")
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Corte no encontrado" });
  res.json({ ok: true });
});

cortesStockPublicoRouter.get("/:token", async (req, res) => {
  const token = req.params.token;
  if (!/^[0-9a-f]{32}$/.test(token)) return res.status(404).json({ error: "Corte no encontrado" });

  const { data, error } = await supabase
    .from("cortes_stock_terminados")
    .select("fecha, nota, total_unidades, datos, created_at")
    .eq("token", token)
    .eq("activo", true)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Este corte no existe o fue retirado" });

  res.set("X-Robots-Tag", "noindex, nofollow");
  res.set("Cache-Control", "no-store");
  res.json(data);
});
