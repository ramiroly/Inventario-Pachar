import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";
import { reporteLiquidosActual } from "../services/reporteLiquidos.service.js";

// Rutas con sesion (admin): ver los litros actuales, guardar cortes y consultarlos.
export const cortesLiquidosRouter = Router();

// Ruta publica (sin sesion): se entra con el token secreto del corte. Solo lectura.
export const cortesLiquidosPublicoRouter = Router();

const COLUMNAS_LISTA = "id, token, fecha, nota, total_litros, created_at";

// Fecha de hoy en Peru (UTC-5): el servidor corre en UTC.
function hoyPeru(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

cortesLiquidosRouter.get("/actual", requireRole("admin"), async (_req, res) => {
  try {
    res.json(await reporteLiquidosActual());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

cortesLiquidosRouter.get("/", requireRole("admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("cortes_stock_liquidos")
    .select(COLUMNAS_LISTA)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

cortesLiquidosRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = z.object({ nota: z.string().trim().max(200).nullish() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const reporte = await reporteLiquidosActual();
    const { data, error } = await supabase
      .from("cortes_stock_liquidos")
      .insert({
        token: randomBytes(16).toString("hex"),
        fecha: hoyPeru(),
        nota: parsed.data.nota || null,
        total_litros: reporte.total_litros,
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
cortesLiquidosRouter.patch("/:id/retirar", requireRole("admin"), async (req, res) => {
  const { data, error } = await supabase
    .from("cortes_stock_liquidos")
    .update({ activo: false })
    .eq("id", req.params.id)
    .select("id")
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Corte no encontrado" });
  res.json({ ok: true });
});

cortesLiquidosPublicoRouter.get("/:token", async (req, res) => {
  const token = req.params.token;
  if (!/^[0-9a-f]{32}$/.test(token)) return res.status(404).json({ error: "Corte no encontrado" });

  const { data, error } = await supabase
    .from("cortes_stock_liquidos")
    .select("fecha, nota, total_litros, datos, created_at")
    .eq("token", token)
    .eq("activo", true)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Este corte no existe o fue retirado" });

  res.set("X-Robots-Tag", "noindex, nofollow");
  res.set("Cache-Control", "no-store");
  res.json(data);
});
