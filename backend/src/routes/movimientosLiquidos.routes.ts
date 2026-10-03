import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabaseClient.js";
import { fetchAll } from "../db/fetchAll.js";
import { requireRole } from "../middleware/requireRole.js";

export const movimientosLiquidosRouter = Router();

const redondear = (n: number) => Math.round(n * 1000) / 1000;
// El servidor trabaja en UTC, que nunca va por detras de la fecha local en Peru:
// solo rechaza fechas realmente futuras.
const hoyUtc = () => new Date().toISOString().slice(0, 10);

const textoOpcional = (max: number) => z.string().trim().max(max).nullish();

const movimientoSchema = z
  .object({
    tanque_id: z.string().uuid(),
    fecha: z.string().date(),
    tipo: z.enum(["ingreso", "egreso"]),
    motivo: z.enum(["lote", "destilacion", "embotellado", "otro"]),
    litros: z.number().positive().max(1_000_000).optional(),
    numero_documento: z.string().trim().min(1).max(50).nullish(),
    nota: textoOpcional(200),
    producto_id: z.string().uuid().nullish(),
    unidades: z.number().int().positive().max(1_000_000).nullish(),
  })
  .superRefine((m, ctx) => {
    const error = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (m.motivo === "embotellado") {
      if (m.tipo !== "egreso") error("tipo", "un embotellado siempre es una salida");
      if (!m.producto_id) error("producto_id", "falta el producto");
      if (!m.unidades) error("unidades", "faltan las unidades");
    } else {
      if (!m.litros) error("litros", "faltan los litros");
      if (m.producto_id || m.unidades) error("producto_id", "producto y unidades solo aplican al embotellado");
    }
  });

const loteNuevoSchema = z.object({
  linea_id: z.string().uuid(),
  lote: z.string().trim().min(1).max(60),
  capacidad_litros: z.number().positive().nullish(),
  litros: z.number().positive().max(1_000_000),
  fecha: z.string().date(),
  numero_documento: z.string().trim().min(1).max(50).nullish(),
  nota: textoOpcional(200),
});

movimientosLiquidosRouter.get("/", requireRole("admin"), async (req, res) => {
  const { tanque_id, desde, hasta, numero_documento } = req.query;
  try {
    const filas = await fetchAll((a, b) => {
      let query = supabase.from("movimientos_liquidos").select("*");
      if (typeof tanque_id === "string") query = query.eq("tanque_id", tanque_id);
      if (typeof desde === "string") query = query.gte("fecha", desde);
      if (typeof hasta === "string") query = query.lte("fecha", hasta);
      if (typeof numero_documento === "string") query = query.eq("numero_documento", numero_documento);
      return query.order("fecha", { ascending: false }).order("created_at", { ascending: false }).order("id").range(a, b);
    });
    res.json(filas);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

movimientosLiquidosRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = movimientoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const m = parsed.data;
  if (m.fecha > hoyUtc()) return res.status(400).json({ error: "La fecha no puede ser futura." });

  const { data: tanque } = await supabase
    .from("tanques_liquidos")
    .select("id, linea_id, tipo, activo, nombre")
    .eq("id", m.tanque_id)
    .single();
  if (!tanque || tanque.activo === false) {
    return res.status(400).json({ error: "El tanque no existe o ya está marcado como terminado." });
  }

  let litros = m.litros;
  if (m.motivo === "embotellado") {
    if (tanque.tipo !== "terminado") {
      return res.status(400).json({ error: "El embotellado sale de un tanque terminado." });
    }
    const { data: producto } = await supabase
      .from("productos_terminados")
      .select("linea_id, formato")
      .eq("id", m.producto_id!)
      .single();
    if (!producto) return res.status(400).json({ error: "El producto no existe." });
    if (producto.linea_id !== tanque.linea_id) {
      return res.status(400).json({ error: "El producto no corresponde a la línea de ese tanque." });
    }
    litros = redondear((m.unidades! * producto.formato) / 1000);
  }

  const { data, error } = await supabase
    .from("movimientos_liquidos")
    .insert({
      tanque_id: m.tanque_id,
      fecha: m.fecha,
      tipo: m.tipo,
      motivo: m.motivo,
      litros,
      numero_documento: m.numero_documento ?? null,
      nota: m.nota || null,
      producto_id: m.producto_id ?? null,
      unidades: m.unidades ?? null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Lote nuevo: cada lote terminado es su propio tanque. Crea el tanque y registra
// el ingreso de sus litros con el mismo N° de registro.
movimientosLiquidosRouter.post("/lote-nuevo", requireRole("admin"), async (req, res) => {
  const parsed = loteNuevoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = parsed.data;
  if (p.fecha > hoyUtc()) return res.status(400).json({ error: "La fecha no puede ser futura." });

  const { data: linea } = await supabase.from("lineas").select("id, nombre").eq("id", p.linea_id).single();
  if (!linea) return res.status(400).json({ error: "La línea no existe." });

  // "29" y "Lote 29" son el mismo lote.
  const lote = /^\d+$/.test(p.lote) ? `Lote ${p.lote}` : p.lote;

  const { data: existentes } = await supabase
    .from("tanques_liquidos")
    .select("lote, capacidad_litros, activo")
    .eq("linea_id", p.linea_id)
    .eq("tipo", "terminado");
  const vigentes = (existentes ?? []).filter((t) => t.activo !== false);
  if (vigentes.some((t) => (t.lote ?? "").toLowerCase() === lote.toLowerCase())) {
    return res.status(400).json({ error: `Ya existe un tanque terminado de ${linea.nombre} con el ${lote}.` });
  }
  const capacidadHabitual = Math.max(0, ...(existentes ?? []).map((t) => Number(t.capacidad_litros ?? 0)));
  const capacidad = p.capacidad_litros ?? (capacidadHabitual || 2500);

  const nombre = `${linea.nombre.toLocaleUpperCase("es")} ${lote.toLocaleUpperCase("es")} TERMINADO`;
  const { data: tanque, error: tanqueError } = await supabase
    .from("tanques_liquidos")
    .insert({ linea_id: p.linea_id, nombre, tipo: "terminado", capacidad_litros: capacidad, lote })
    .select()
    .single();
  if (tanqueError) return res.status(500).json({ error: tanqueError.message });

  const { data: movimiento, error: movError } = await supabase
    .from("movimientos_liquidos")
    .insert({
      tanque_id: tanque.id,
      fecha: p.fecha,
      tipo: "ingreso",
      motivo: "lote",
      litros: p.litros,
      numero_documento: p.numero_documento ?? null,
      nota: p.nota || null,
    })
    .select()
    .single();
  if (movError) {
    await supabase.from("tanques_liquidos").delete().eq("id", tanque.id);
    return res.status(500).json({ error: movError.message });
  }

  res.status(201).json({ tanque, movimiento });
});
