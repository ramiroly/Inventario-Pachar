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

// Corte completo: todos los tanques de una fecha en una sola llamada. `lote`
// solo se envía para los tanques cuyo lote cambió (undefined = no tocar,
// null = borrar el lote).
const corteSchema = z
  .object({
    fecha_corte: z.string().date(),
    items: z
      .array(
        z.object({
          tanque_id: z.string().uuid(),
          litros: z.number().min(0),
          lote: z.string().trim().max(60).nullish(),
        })
      )
      .min(1)
      .max(200),
  })
  .refine((c) => new Set(c.items.map((i) => i.tanque_id)).size === c.items.length, {
    message: "hay tanques repetidos en el corte",
    path: ["items"],
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

snapshotsRouter.post("/corte", requireRole("admin"), async (req, res) => {
  const parsed = corteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { fecha_corte, items } = parsed.data;

  // Reenviar el mismo corte es seguro: el upsert pisa los valores de esa fecha.
  const { error } = await supabase.from("stock_liquidos_snapshot").upsert(
    items.map((i) => ({ tanque_id: i.tanque_id, fecha_corte, litros: i.litros })),
    { onConflict: "tanque_id,fecha_corte" }
  );
  if (error) return res.status(500).json({ error: error.message });

  const conLote = items.filter((i) => i.lote !== undefined);
  for (const item of conLote) {
    const nuevoLote = item.lote || null;
    const cambios: { lote: string | null; nombre?: string } = { lote: nuevoLote };

    // El nombre de los tanques terminados incluye el lote ("MATACUY LOTE 27 TERMINADO"):
    // si cambia el lote, se reemplaza esa parte para que no queden desfasados.
    const { data: actual } = await supabase.from("tanques_liquidos").select("nombre, lote").eq("id", item.tanque_id).single();
    if (actual?.lote && nuevoLote) {
      const patron = new RegExp(actual.lote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (patron.test(actual.nombre)) cambios.nombre = actual.nombre.replace(patron, nuevoLote.toLocaleUpperCase("es"));
    }

    const { error: loteError } = await supabase.from("tanques_liquidos").update(cambios).eq("id", item.tanque_id);
    if (loteError) return res.status(500).json({ error: loteError.message });
  }

  res.status(201).json({ fecha_corte, guardados: items.length, lotes_actualizados: conLote.length });
});
