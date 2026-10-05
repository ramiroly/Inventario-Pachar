import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { fetchAll } from "../db/fetchAll.js";
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

/**
 * Litros que "deberia" haber en cada tanque segun el ultimo corte medido mas los
 * movimientos posteriores. Un movimiento con la misma fecha que un corte se
 * considera ya incluido en esa medicion.
 *  - modo=corte (por defecto): para precargar un corte nuevo; el punto de partida
 *    es el ultimo corte ANTERIOR a `fecha`.
 *  - modo=saldo: saldo a la fecha; el punto de partida es el ultimo corte hasta `fecha`.
 */
snapshotsRouter.get("/esperados", requireRole("admin"), async (req, res) => {
  const fecha = z.string().date().safeParse(req.query.fecha);
  if (!fecha.success) return res.status(400).json({ error: "Falta una fecha válida (YYYY-MM-DD)." });
  const alDia = req.query.modo === "saldo";

  try {
    const [{ data: tanques, error: tanquesError }, snapshots, movimientos] = await Promise.all([
      supabase.from("tanques_liquidos").select("id, activo"),
      fetchAll<{ tanque_id: string; fecha_corte: string; litros: number }>((a, b) =>
        supabase
          .from("stock_liquidos_snapshot")
          .select("tanque_id, fecha_corte, litros")
          .order("fecha_corte", { ascending: false })
          .order("tanque_id")
          .range(a, b)
      ),
      fetchAll<{ tanque_id: string; fecha: string; tipo: string; litros: number; anulado: boolean }>((a, b) =>
        supabase
          .from("movimientos_liquidos")
          .select("tanque_id, fecha, tipo, litros, anulado")
          .lte("fecha", fecha.data)
          .order("fecha")
          .order("id")
          .range(a, b)
      ),
    ]);
    if (tanquesError) return res.status(500).json({ error: tanquesError.message });

    const lecturas = new Map<string, { fecha: string; litros: number }[]>();
    for (const s of snapshots) {
      const lista = lecturas.get(s.tanque_id) ?? [];
      lista.push({ fecha: s.fecha_corte, litros: Number(s.litros) });
      lecturas.set(s.tanque_id, lista);
    }
    const movsPorTanque = new Map<string, typeof movimientos>();
    for (const m of movimientos.filter((x) => !x.anulado)) {
      const lista = movsPorTanque.get(m.tanque_id) ?? [];
      lista.push(m);
      movsPorTanque.set(m.tanque_id, lista);
    }

    const resultado: Record<string, { base_fecha: string | null; base_litros: number | null; neto: number; esperado: number }> = {};
    for (const t of tanques ?? []) {
      if (t.activo === false) continue;
      const base = (lecturas.get(t.id) ?? []).find((l) => (alDia ? l.fecha <= fecha.data : l.fecha < fecha.data)) ?? null;
      const neto = (movsPorTanque.get(t.id) ?? [])
        .filter((m) => !base || m.fecha > base.fecha)
        .reduce((acc, m) => acc + (m.tipo === "ingreso" ? 1 : -1) * Number(m.litros), 0);
      const redondeado = (n: number) => Math.round(n * 1000) / 1000;
      resultado[t.id] = {
        base_fecha: base?.fecha ?? null,
        base_litros: base?.litros ?? null,
        neto: redondeado(neto),
        esperado: redondeado((base?.litros ?? 0) + neto),
      };
    }
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
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
