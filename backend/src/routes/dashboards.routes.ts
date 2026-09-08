import { Router } from "express";
import { supabase } from "../config/supabaseClient.js";
import { requireRole } from "../middleware/requireRole.js";
import { calcularCoberturaSemanas, calcularSemaforo } from "../services/coverage.service.js";
import { calcularCajasYSueltas } from "../services/packaging.service.js";
import { compararLiquido } from "../services/liquidComparison.service.js";
import type { MovimientoTerminado, ProductoTerminado } from "../types/models.js";

export const dashboardsRouter = Router();

function diasEntre(desde: string, hasta: string): number {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  return Math.max(ms / (1000 * 60 * 60 * 24), 1);
}

/**
 * Dashboard 1: stock terminados — KPIs, cobertura/alertas, salidas por destino,
 * semáforo por SKU, tabla ejecutiva por línea×formato.
 *
 * Query params: desde, hasta (ISO date) — período usado para tasa_semanal/cobertura.
 * Nota: Matacuy 700ml exportación se excluye del gráfico apilado principal
 * (decisión de Ramiro, 03/09/2026) pero se incluye en la tabla ejecutiva.
 */
dashboardsRouter.get("/stock", requireRole("socio"), async (req, res) => {
  const hasta = typeof req.query.hasta === "string" ? req.query.hasta : new Date().toISOString().slice(0, 10);
  const desde =
    typeof req.query.desde === "string"
      ? req.query.desde
      : new Date(new Date(hasta).getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: productos, error: prodError }, { data: movimientos, error: movError }, { data: lineas, error: lineasError }] =
    await Promise.all([
      supabase.from("productos_terminados").select("*"),
      supabase.from("movimientos_terminados").select("*"),
      supabase.from("lineas").select("*"),
    ]);

  if (prodError || movError || lineasError) {
    return res.status(500).json({ error: (prodError ?? movError ?? lineasError)?.message });
  }

  const productosPorId = new Map((productos as ProductoTerminado[]).map((p) => [p.id, p]));
  const lineasPorId = new Map((lineas ?? []).map((l) => [l.id, l]));
  const diasPeriodo = diasEntre(desde, hasta);

  const stockPorProducto = new Map<string, number>();
  const salidasPeriodoPorProducto = new Map<string, number>();
  // Por destino Y por línea a la vez, para el desglose "unidades despachadas
  // por línea" dentro de cada destino (igual al SAL.por_destino[x].lineas original).
  const salidasPorDestino = new Map<string, { total: number; porLinea: Map<string, number> }>();

  for (const mov of movimientos as MovimientoTerminado[]) {
    const signo = mov.tipo === "entrada" ? 1 : -1;
    stockPorProducto.set(mov.producto_id, (stockPorProducto.get(mov.producto_id) ?? 0) + signo * mov.cantidad);

    if (mov.tipo === "salida" && mov.fecha >= desde && mov.fecha <= hasta) {
      salidasPeriodoPorProducto.set(
        mov.producto_id,
        (salidasPeriodoPorProducto.get(mov.producto_id) ?? 0) + mov.cantidad
      );
      if (mov.destino) {
        const producto = productosPorId.get(mov.producto_id);
        const lineaNombre = producto ? lineasPorId.get(producto.linea_id)?.nombre : undefined;
        let entry = salidasPorDestino.get(mov.destino);
        if (!entry) {
          entry = { total: 0, porLinea: new Map() };
          salidasPorDestino.set(mov.destino, entry);
        }
        entry.total += mov.cantidad;
        if (lineaNombre) entry.porLinea.set(lineaNombre, (entry.porLinea.get(lineaNombre) ?? 0) + mov.cantidad);
      }
    }
  }

  const stockPorLinea = new Map<string, number>();
  const salidasPeriodoPorLinea = new Map<string, number>();
  const productosResp: Array<{
    producto_id: string;
    descripcion: string;
    linea_id: string;
    linea: string;
    formato: number;
    upb: number;
    tipo_envase: string;
    es_exportacion: boolean;
    stock: number;
    cajas: number;
    sueltas: number;
    cobertura_semanas: number | null;
    semaforo: string;
    excluir_grafico_principal: boolean;
  }> = [];

  for (const producto of productosPorId.values()) {
    const stock = stockPorProducto.get(producto.id) ?? 0;
    const salidasPeriodo = salidasPeriodoPorProducto.get(producto.id) ?? 0;

    stockPorLinea.set(producto.linea_id, (stockPorLinea.get(producto.linea_id) ?? 0) + stock);
    salidasPeriodoPorLinea.set(
      producto.linea_id,
      (salidasPeriodoPorLinea.get(producto.linea_id) ?? 0) + salidasPeriodo
    );

    const { cajas, sueltas } = calcularCajasYSueltas(stock, producto.upb);
    const coberturaSemanas = calcularCoberturaSemanas(stock, salidasPeriodo, diasPeriodo);

    productosResp.push({
      producto_id: producto.id,
      descripcion: producto.descripcion,
      linea_id: producto.linea_id,
      linea: lineasPorId.get(producto.linea_id)?.nombre ?? "",
      formato: producto.formato,
      upb: producto.upb,
      tipo_envase: producto.tipo_envase,
      es_exportacion: producto.es_exportacion,
      stock,
      cajas,
      sueltas,
      cobertura_semanas: coberturaSemanas,
      semaforo: calcularSemaforo(coberturaSemanas),
      // Matacuy 700ml exportación: no se grafica en el apilado principal.
      excluir_grafico_principal: producto.formato === 700 && producto.es_exportacion,
    });
  }

  const semanasPeriodo = diasPeriodo / 7;
  const coberturaPorLinea = (lineas ?? []).map((linea) => {
    const stock = stockPorLinea.get(linea.id) ?? 0;
    const salidasPeriodo = salidasPeriodoPorLinea.get(linea.id) ?? 0;
    const coberturaSemanas = calcularCoberturaSemanas(stock, salidasPeriodo, diasPeriodo);
    return {
      linea_id: linea.id,
      nombre: linea.nombre,
      color_dark: linea.color_dark,
      color_light: linea.color_light,
      color_sub: linea.color_sub,
      stock,
      salidas_periodo: salidasPeriodo,
      weekly_rate: semanasPeriodo > 0 ? salidasPeriodo / semanasPeriodo : 0,
      cobertura_semanas: coberturaSemanas,
      semaforo: calcularSemaforo(coberturaSemanas),
    };
  });

  const salidasPorDestinoResp = [...salidasPorDestino.entries()].map(([destino, { total, porLinea }]) => ({
    destino,
    total,
    por_linea: Object.fromEntries(porLinea),
  }));

  res.json({
    periodo: { desde, hasta, dias: diasPeriodo },
    kpis: {
      stock_total: [...stockPorProducto.values()].reduce((a, b) => a + b, 0),
      salidas_periodo_total: [...salidasPeriodoPorProducto.values()].reduce((a, b) => a + b, 0),
    },
    lineas: coberturaPorLinea,
    productos: productosResp,
    salidas: {
      total: [...salidasPeriodoPorProducto.values()].reduce((a, b) => a + b, 0),
      por_destino: salidasPorDestinoResp,
    },
    // Alias retro-compatibles con la forma anterior de la respuesta.
    cobertura_por_linea: coberturaPorLinea,
    salidas_por_destino: Object.fromEntries(salidasPorDestinoResp.map((d) => [d.destino, d.total])),
    semaforo_por_sku: productosResp,
  });
});

/**
 * Dashboard 2: comparativo terminados — semana anterior vs actual por línea,
 * detalle por formato.
 * Query params: fecha_corte, fecha_corte_anterior (ISO date, snapshots implícitos
 * vía stock acumulado a esa fecha).
 */
dashboardsRouter.get("/comparativo", requireRole("socio"), async (req, res) => {
  const [{ data: productos, error: prodError }, { data: movimientos, error: movError }, { data: lineas, error: lineasError }] =
    await Promise.all([
      supabase.from("productos_terminados").select("*"),
      supabase.from("movimientos_terminados").select("*"),
      supabase.from("lineas").select("*"),
    ]);
  if (prodError || movError || lineasError) {
    return res.status(500).json({ error: (prodError ?? movError ?? lineasError)?.message });
  }

  const todosMovimientos = movimientos as MovimientoTerminado[];
  // Sin fecha_corte explícito, se ancla a la fecha real más reciente cargada
  // (no "hoy") — si el último movimiento real es del 31/08, comparar contra
  // "hoy" siempre daría variación 0 porque no hay nada registrado después.
  const fechaMaxima = todosMovimientos.reduce((max, m) => (m.fecha > max ? m.fecha : max), "0000-01-01");
  const anclaFecha = fechaMaxima === "0000-01-01" ? new Date().toISOString().slice(0, 10) : fechaMaxima;

  const fechaCorte = typeof req.query.fecha_corte === "string" ? req.query.fecha_corte : anclaFecha;
  const fechaAnterior =
    typeof req.query.fecha_corte_anterior === "string"
      ? req.query.fecha_corte_anterior
      : new Date(new Date(fechaCorte).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const productosPorId = new Map((productos as ProductoTerminado[]).map((p) => [p.id, p]));
  const lineasPorId = new Map((lineas ?? []).map((l) => [l.id, l]));

  function stockAcumuladoHasta(fechaLimite: string) {
    const stock = new Map<string, number>();
    for (const mov of todosMovimientos) {
      if (mov.fecha > fechaLimite) continue;
      const signo = mov.tipo === "entrada" ? 1 : -1;
      stock.set(mov.producto_id, (stock.get(mov.producto_id) ?? 0) + signo * mov.cantidad);
    }
    return stock;
  }

  const stockActual = stockAcumuladoHasta(fechaCorte);
  const stockAnterior = stockAcumuladoHasta(fechaAnterior);

  const detallePorFormato = [...productosPorId.values()].map((producto) => {
    const actual = stockActual.get(producto.id) ?? 0;
    const anterior = stockAnterior.get(producto.id) ?? 0;
    return {
      producto_id: producto.id,
      linea_id: producto.linea_id,
      linea: lineasPorId.get(producto.linea_id)?.nombre ?? "",
      descripcion: producto.descripcion,
      formato: producto.formato,
      upb: producto.upb,
      tipo_envase: producto.tipo_envase,
      stock_actual: actual,
      stock_anterior: anterior,
      variacion: actual - anterior,
    };
  });

  const totalesPorLineaMap = new Map<string, { linea_id: string; nombre: string; stock_actual: number; stock_anterior: number }>();
  for (const item of detallePorFormato) {
    const entry = totalesPorLineaMap.get(item.linea_id) ?? {
      linea_id: item.linea_id,
      nombre: item.linea,
      stock_actual: 0,
      stock_anterior: 0,
    };
    entry.stock_actual += item.stock_actual;
    entry.stock_anterior += item.stock_anterior;
    totalesPorLineaMap.set(item.linea_id, entry);
  }

  res.json({
    fecha_corte: fechaCorte,
    fecha_corte_anterior: fechaAnterior,
    detalle_por_formato: detallePorFormato,
    totales_por_linea: [...totalesPorLineaMap.values()],
  });
});

/**
 * Dashboard 3: líquidos — tanques por línea (terminado + subproductos),
 * participación, comparativa semanal, variación neta por tanque.
 * Usa los dos snapshots más recientes por tanque (compararLiquido).
 */
dashboardsRouter.get("/liquidos", requireRole("socio"), async (_req, res) => {
  const [{ data: tanques, error: tanquesError }, { data: snapshots, error: snapshotsError }] = await Promise.all([
    supabase.from("tanques_liquidos").select("*"),
    supabase.from("stock_liquidos_snapshot").select("*").order("fecha_corte", { ascending: false }),
  ]);
  if (tanquesError || snapshotsError) {
    return res.status(500).json({ error: (tanquesError ?? snapshotsError)?.message });
  }

  const snapshotsPorTanque = new Map<string, typeof snapshots>();
  for (const snap of snapshots ?? []) {
    const lista = snapshotsPorTanque.get(snap.tanque_id) ?? [];
    lista.push(snap);
    snapshotsPorTanque.set(snap.tanque_id, lista);
  }

  const detalle = (tanques ?? []).map((tanque) => {
    const historicos = snapshotsPorTanque.get(tanque.id) ?? [];
    const actual = historicos[0]?.litros ?? 0;
    const anterior = historicos[1]?.litros ?? 0;
    const { delta, loteNuevo } = compararLiquido(actual, anterior);

    return {
      tanque_id: tanque.id,
      linea_id: tanque.linea_id,
      nombre: tanque.nombre,
      tipo: tanque.tipo,
      capacidad_litros: tanque.capacidad_litros,
      litros_actual: actual,
      litros_anterior: anterior,
      delta,
      lote_nuevo: loteNuevo,
      fecha_corte: historicos[0]?.fecha_corte ?? null,
    };
  });

  res.json({ tanques: detalle });
});
