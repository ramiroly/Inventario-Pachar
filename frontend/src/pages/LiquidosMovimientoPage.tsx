import { useCallback, useEffect, useMemo, useState } from "react";
import logoCerros from "../assets/logo-cerros.png";
import { SubPestanas, SUBPESTANAS_LIQUIDOS } from "../components/SubPestanas";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { formatoFecha, hoyLocal } from "../lib/fechas";
import { ordenLinea } from "../lib/lineas";
import { conSignoLitros, formatoLitros, parseLitros } from "../lib/numeros";
import { ETIQUETA_ESTADO, type EsperadoTanque, type EstadoLote, type Linea, type ProductoTerminado, type TanqueLiquido } from "../types/models";
import styles from "./movimientos.module.css";

type Direccion = "egreso" | "ingreso" | "ajuste" | "estado";
type Motivo = "embotellado" | "lote" | "destilacion" | "otro" | "lote-nuevo";

const MOTIVOS: Record<"egreso" | "ingreso", { id: Motivo; etiqueta: string }[]> = {
  egreso: [
    { id: "embotellado", etiqueta: "Embotellado" },
    { id: "lote", etiqueta: "Consumo para preparar un lote" },
    { id: "destilacion", etiqueta: "Destilación" },
    { id: "otro", etiqueta: "Otro (merma, muestra, venta)" },
  ],
  ingreso: [
    { id: "lote-nuevo", etiqueta: "Lote nuevo (crea su tanque)" },
    { id: "destilacion", etiqueta: "Destilación" },
    { id: "otro", etiqueta: "Otro" },
  ],
};

const redondear = (n: number) => Math.round(n * 1000) / 1000;

export function LiquidosMovimientoPage() {
  const [tanques, setTanques] = useState<TanqueLiquido[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [saldos, setSaldos] = useState<Record<string, EsperadoTanque>>({});
  const [cargando, setCargando] = useState(true);

  const [direccion, setDireccion] = useState<Direccion>("egreso");
  const [motivo, setMotivo] = useState<Motivo>("embotellado");
  const [tanqueId, setTanqueId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [unidades, setUnidades] = useState("");
  const [litros, setLitros] = useState("");
  const [medido, setMedido] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoLote | "">("");
  const [estadoInicial, setEstadoInicial] = useState<EstadoLote>("proceso");
  const [lineaId, setLineaId] = useState("");
  const [loteTexto, setLoteTexto] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [origenes, setOrigenes] = useState<{ tanqueId: string; litros: string }[]>([]);
  const [fecha, setFecha] = useState(hoyLocal);
  const [numero, setNumero] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [t, l, p, s] = await Promise.all([
      api.get<TanqueLiquido[]>("/tanques"),
      api.get<Linea[]>("/lineas"),
      api.get<ProductoTerminado[]>("/productos"),
      api.get<Record<string, EsperadoTanque>>(`/snapshots/esperados?fecha=${hoyLocal()}&modo=saldo`),
    ]);
    setTanques(t.filter((x) => x.activo !== false));
    setLineas(l);
    setProductos(p);
    setSaldos(s);
  }, []);

  useEffect(() => {
    cargar()
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, [cargar]);

  const lineasOrdenadas = useMemo(() => [...lineas].sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre)), [lineas]);
  const lineaPorId = useMemo(() => new Map(lineas.map((l) => [l.id, l])), [lineas]);

  const esAjuste = direccion === "ajuste";
  const esEstado = direccion === "estado";
  const esEmbotellado = direccion === "egreso" && motivo === "embotellado";
  const esLoteNuevo = direccion === "ingreso" && motivo === "lote-nuevo";

  // Tanques elegibles: el embotellado solo sale de tanques terminados.
  const gruposTanques = useMemo(() => {
    // El embotellado solo sale de lotes aprobados (estado terminado); el cambio de estado, de cualquier lote.
    const elegibles = esEmbotellado
      ? tanques.filter((t) => t.tipo === "terminado" && (t.estado ?? "terminado") === "terminado")
      : esEstado
        ? tanques.filter((t) => t.tipo === "terminado")
        : tanques;
    return lineasOrdenadas
      .map((linea) => ({
        linea,
        tanques: elegibles
          .filter((t) => t.linea_id === linea.id)
          .sort(
            (a, b) =>
              (a.tipo === b.tipo ? 0 : a.tipo === "terminado" ? -1 : 1) ||
              String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) ||
              a.nombre.localeCompare(b.nombre, "es")
          ),
      }))
      .filter((g) => g.tanques.length > 0);
  }, [tanques, lineasOrdenadas, esEmbotellado, esEstado]);

  const tanqueSel = tanques.find((t) => t.id === tanqueId);
  const productosDelTanque = useMemo(
    () => (tanqueSel ? productos.filter((p) => p.linea_id === tanqueSel.linea_id) : []),
    [productos, tanqueSel]
  );
  const productoSel = productos.find((p) => p.id === productoId);

  const unidadesNum = /^\d+$/.test(unidades) ? Number(unidades) : null;
  const litrosCalculados =
    esEmbotellado && productoSel && unidadesNum ? redondear((unidadesNum * productoSel.formato) / 1000) : null;
  const litrosMov = esEmbotellado ? litrosCalculados : parseLitros(litros);
  const saldo = tanqueSel ? (saldos[tanqueSel.id]?.esperado ?? 0) : null;
  const quedaria =
    saldo !== null && litrosMov !== null && !esLoteNuevo
      ? redondear(saldo + (direccion === "ingreso" ? litrosMov : -litrosMov))
      : null;

  // Ajuste: el nivel real medido contra lo que el sistema calcula hoy.
  const medidoNum = esAjuste ? parseLitros(medido) : null;
  const diferencia = esAjuste && saldo !== null && medidoNum !== null ? redondear(medidoNum - saldo) : null;
  // Un movimiento con fecha igual o anterior a la ultima medicion del tanque se da por incluido en ella.
  const baseFecha = tanqueSel ? (saldos[tanqueSel.id]?.base_fecha ?? null) : null;
  const fechaIncluida = !!baseFecha && fecha <= baseFecha;

  const estadoActual = tanqueSel?.estado ?? "terminado";
  const estadosPosibles = (Object.keys(ETIQUETA_ESTADO) as EstadoLote[]).filter((e) => e !== estadoActual);

  const loteNormalizado = /^\d+$/.test(loteTexto.trim()) ? `Lote ${loteTexto.trim()}` : loteTexto.trim();
  const lineaLote = lineaPorId.get(lineaId);
  const nombreNuevoTanque =
    lineaLote && loteNormalizado ? `${lineaLote.nombre.toLocaleUpperCase("es")} ${loteNormalizado.toLocaleUpperCase("es")}` : null;

  // Lote preparado con otros tanques: lo que falta para llegar a los litros del lote es agua.
  const litrosLote = parseLitros(litros);
  const usadoOrigenes = redondear(origenes.reduce((acc, o) => acc + (parseLitros(o.litros) ?? 0), 0));
  const aguaLote = litrosLote !== null ? redondear(litrosLote - usadoOrigenes) : null;

  function cambiarOrigen(i: number, cambio: Partial<{ tanqueId: string; litros: string }>) {
    setOrigenes((lista) => lista.map((o, j) => (j === i ? { ...o, ...cambio } : o)));
  }

  function cambiarDireccion(d: Direccion) {
    setDireccion(d);
    setMotivo(d === "ajuste" || d === "estado" ? "otro" : MOTIVOS[d][0].id);
    setEstadoNuevo("");
    setOrigenes([]);
    setTanqueId("");
    setProductoId("");
    setError(null);
    setMensaje(null);
  }

  function cambiarMotivo(m: Motivo) {
    setMotivo(m);
    setOrigenes([]);
    setTanqueId("");
    setProductoId("");
    setError(null);
    setMensaje(null);
  }

  async function guardar() {
    if (fecha > hoyLocal()) throw new Error("La fecha no puede ser futura.");
    const comunes = { fecha, numero_documento: numero.trim() || null, nota: nota.trim() || null };

    if (esLoteNuevo) {
      const l = parseLitros(litros);
      const cap = capacidad.trim() === "" ? null : parseLitros(capacidad);
      if (!lineaId) throw new Error("Selecciona la línea del lote.");
      if (!loteTexto.trim()) throw new Error("Escribe el lote (por ejemplo Lote 29).");
      if (l === null || l <= 0) throw new Error("Escribe los litros del lote (mayor a 0).");
      if (cap !== null && cap <= 0) throw new Error("La capacidad debe ser mayor a 0.");
      const origenesValidos = origenes.map((o) => ({ tanque_id: o.tanqueId, litros: parseLitros(o.litros) }));
      if (origenesValidos.some((o) => !o.tanque_id || o.litros === null || o.litros <= 0)) {
        throw new Error("Cada tanque de origen necesita el tanque y los litros usados (mayor a 0).");
      }
      if (new Set(origenesValidos.map((o) => o.tanque_id)).size !== origenesValidos.length) {
        throw new Error("Un tanque de origen está repetido.");
      }
      if (origenesValidos.length > 0 && usadoOrigenes > l) {
        throw new Error("Los litros usados de otros tanques superan los litros del lote.");
      }
      const r = await api.post<{ tanque: TanqueLiquido; agua_litros: number }>("/movimientos-liquidos/lote-nuevo", {
        linea_id: lineaId,
        lote: loteTexto.trim(),
        capacidad_litros: cap,
        litros: l,
        estado: estadoInicial,
        origenes: origenesValidos,
        ...comunes,
      });
      setMensaje(
        `Lote nuevo registrado: ${r.tanque.nombre} (${ETIQUETA_ESTADO[estadoInicial].toLowerCase()}) con ${formatoLitros(l)} L` +
          (origenesValidos.length > 0
            ? `, de los cuales ${formatoLitros(usadoOrigenes)} L salieron de otros tanques y ${formatoLitros(r.agua_litros)} L son agua.`
            : ".")
      );
      setLoteTexto("");
      setLitros("");
      setOrigenes([]);
      return;
    }

    if (!tanqueSel) throw new Error("Selecciona el tanque.");

    if (esEstado) {
      if (!estadoNuevo) throw new Error("Elige el nuevo estado del lote.");
      await api.post("/cambios-estado-lote", {
        tanque_id: tanqueSel.id,
        estado: estadoNuevo,
        fecha,
        nota: nota.trim() || null,
      });
      setMensaje(`Estado actualizado: ${tanqueSel.nombre} pasó de ${ETIQUETA_ESTADO[estadoActual].toLowerCase()} a ${ETIQUETA_ESTADO[estadoNuevo].toLowerCase()}.`);
      setEstadoNuevo("");
      setNota("");
      setTanqueId("");
      return;
    }

    if (esAjuste) {
      if (medidoNum === null) throw new Error("Escribe los litros medidos realmente en el tanque (0 o más).");
      if (fechaIncluida) {
        throw new Error(
          `El ajuste debe tener una fecha posterior a la última medición de este tanque (${formatoFecha(baseFecha!)}). Usa la fecha de hoy.`
        );
      }
      if (diferencia === null || diferencia === 0) throw new Error("Lo medido coincide con el sistema: no hay nada que ajustar.");
      await api.post("/movimientos-liquidos", {
        tanque_id: tanqueSel.id,
        tipo: diferencia > 0 ? "ingreso" : "egreso",
        motivo: "ajuste",
        litros: Math.abs(diferencia),
        fecha,
        nota: nota.trim() || null,
      });
      setMensaje(
        `Ajuste registrado: ${tanqueSel.nombre} pasó de ${formatoLitros(saldo ?? 0)} a ${formatoLitros(medidoNum)} L (${conSignoLitros(diferencia)}).`
      );
      setMedido("");
      setNota("");
      return;
    }

    if (esEmbotellado) {
      if (!productoSel) throw new Error("Selecciona el producto embotellado.");
      if (!unidadesNum || unidadesNum < 1) throw new Error("Escribe las unidades embotelladas (mayor a 0).");
      await api.post("/movimientos-liquidos", {
        tanque_id: tanqueSel.id,
        tipo: "egreso",
        motivo: "embotellado",
        producto_id: productoSel.id,
        unidades: unidadesNum,
        ...comunes,
      });
      setMensaje(
        `Embotellado registrado: ${formatoLitros(unidadesNum)} u. de ${productoSel.descripcion} · ${formatoLitros(litrosCalculados ?? 0)} L descontados de ${tanqueSel.nombre}.`
      );
      setUnidades("");
      return;
    }

    const l = parseLitros(litros);
    if (l === null || l <= 0) throw new Error("Escribe los litros (mayor a 0).");
    await api.post("/movimientos-liquidos", {
      tanque_id: tanqueSel.id,
      tipo: direccion,
      motivo,
      litros: l,
      ...comunes,
    });
    setMensaje(
      `${direccion === "egreso" ? "Salida" : "Ingreso"} registrado: ${formatoLitros(l)} L ${direccion === "egreso" ? "de" : "en"} ${tanqueSel.nombre}.`
    );
    setLitros("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      await guardar();
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.page}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SubPestanas opciones={SUBPESTANAS_LIQUIDOS} actual="/liquidos/cargar/movimiento" />
      </div>
      <div className={styles.shell}>
        <aside className={styles.aside}>
          <img className={styles.logo} src={logoCerros} alt="Destilería Andina" />
          <p className={styles.asideTitulo}>Movimientos de líquidos</p>
          <ul className={styles.notas}>
            <li>
              <strong>Salida:</strong> litros que dejan un tanque. En un embotellado se calculan solos con las unidades.
            </li>
            <li>
              <strong>Ingreso:</strong> litros que entran a un tanque. Un lote nuevo crea su propio tanque.
            </li>
            <li>
              <strong>Ajuste:</strong> corrige el nivel de un tanque según lo que mediste realmente.
            </li>
            <li>
              <strong>Estado:</strong> pasa un lote de en proceso a en reposo y a terminado (aprobado). Solo los lotes terminados se embotellan.
            </li>
            <li>Usa el mismo N° de registro en todas las líneas de una operación.</li>
            <li>El corte semanal sigue siendo la medida oficial: aquí solo se calcula lo que debería haber.</li>
          </ul>
        </aside>

        <main className={styles.main}>
          <h1 className={styles.titulo}>Movimiento de líquidos</h1>
          <p className={styles.subtitulo}>Registra una salida, un ingreso, un ajuste de litros o un cambio de estado de lote.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo de movimiento</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Tipo de movimiento" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                {(["egreso", "ingreso", "ajuste", "estado"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={direccion === d}
                    className={direccion === d ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
                    onClick={() => cambiarDireccion(d)}
                  >
                    {d === "egreso" ? "Salida" : d === "ingreso" ? "Ingreso" : d === "ajuste" ? "Ajuste" : "Estado"}
                  </button>
                ))}
              </div>
            </div>

            {!esAjuste && !esEstado && (
            <div className={styles.field}>
              <label htmlFor="motivo" className={styles.label}>
                Motivo
              </label>
              <select id="motivo" className={styles.input} value={motivo} onChange={(e) => cambiarMotivo(e.target.value as Motivo)}>
                {MOTIVOS[direccion as "egreso" | "ingreso"].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            )}

            {esLoteNuevo ? (
              <>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="linea" className={styles.label}>
                      Línea
                    </label>
                    <select id="linea" className={styles.input} value={lineaId} onChange={(e) => setLineaId(e.target.value)} required>
                      <option value="" disabled>
                        Selecciona una línea...
                      </option>
                      {lineasOrdenadas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="lote" className={styles.label}>
                      Lote
                    </label>
                    <input
                      id="lote"
                      className={styles.input}
                      type="text"
                      maxLength={60}
                      autoComplete="off"
                      placeholder="Ej. Lote 29"
                      value={loteTexto}
                      onChange={(e) => setLoteTexto(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="litros" className={styles.label}>
                      Litros del lote
                    </label>
                    <input
                      id="litros"
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Ej. 2000"
                      value={litros}
                      onChange={(e) => setLitros(e.target.value.replace(/[^\d.,]/g, ""))}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="capacidad" className={styles.label}>
                      Capacidad del tanque (opcional)
                    </label>
                    <input
                      id="capacidad"
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Igual que el lote anterior"
                      value={capacidad}
                      onChange={(e) => setCapacidad(e.target.value.replace(/[^\d.,]/g, ""))}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="estadoInicial" className={styles.label}>
                    Estado del lote
                  </label>
                  <select id="estadoInicial" className={styles.input} value={estadoInicial} onChange={(e) => setEstadoInicial(e.target.value as EstadoLote)}>
                    {(Object.keys(ETIQUETA_ESTADO) as EstadoLote[]).map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_ESTADO[e]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Mezcla de otros tanques (opcional)</span>
                  <p className={styles.hint}>
                    Si el lote se preparó con destilado de otros tanques y agua para bajar el grado, elige de qué tanques salió y cuántos litros. Lo que falte
                    para llegar a los litros del lote se anota como agua.
                  </p>
                  {origenes.map((o, i) => {
                    const saldoOrigen = saldos[o.tanqueId]?.esperado;
                    const litrosOrigen = parseLitros(o.litros);
                    const baseOrigen = saldos[o.tanqueId]?.base_fecha ?? null;
                    return (
                      <div key={i}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 10 }}>
                          <select
                            aria-label="Tanque de origen"
                            className={styles.input}
                            value={o.tanqueId}
                            onChange={(e) => cambiarOrigen(i, { tanqueId: e.target.value })}
                          >
                            <option value="" disabled>
                              Selecciona un tanque...
                            </option>
                            {gruposTanques.map(({ linea, tanques: lista }) => (
                              <optgroup key={linea.id} label={linea.nombre}>
                                {lista.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.nombre} · {formatoLitros(saldos[t.id]?.esperado ?? 0)} L
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            aria-label="Litros usados"
                            className={styles.input}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="Litros"
                            value={o.litros}
                            onChange={(e) => cambiarOrigen(i, { litros: e.target.value.replace(/[^\d.,]/g, "") })}
                          />
                          <button
                            type="button"
                            className={styles.input}
                            style={{ cursor: "pointer", width: 46, padding: 0 }}
                            aria-label="Quitar tanque de origen"
                            onClick={() => setOrigenes((lista) => lista.filter((_, j) => j !== i))}
                          >
                            ✕
                          </button>
                        </div>
                        {saldoOrigen !== undefined && litrosOrigen !== null && litrosOrigen > saldoOrigen && (
                          <p className={styles.hint}>Ojo: ese tanque tiene {formatoLitros(saldoOrigen)} L según el sistema.</p>
                        )}
                        {baseOrigen && fecha <= baseOrigen && (
                          <p className={styles.hint}>
                            Ojo: la fecha es igual o anterior a la última medición de ese tanque ({formatoFecha(baseOrigen)}); el sistema da esa salida por
                            incluida en la medición y no bajará su nivel.
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className={styles.input}
                    style={{ cursor: "pointer", width: "fit-content" }}
                    onClick={() => setOrigenes((lista) => [...lista, { tanqueId: "", litros: "" }])}
                  >
                    + Agregar tanque de origen
                  </button>
                  {origenes.length > 0 && aguaLote !== null && (
                    <p className={styles.hint}>
                      {aguaLote >= 0
                        ? `Usado de otros tanques: ${formatoLitros(usadoOrigenes)} L · Agua agregada: ${formatoLitros(aguaLote)} L · Lote: ${formatoLitros(litrosLote ?? 0)} L.`
                        : "Los litros usados de otros tanques superan los litros del lote."}
                    </p>
                  )}
                </div>
                {nombreNuevoTanque && <p className={styles.hint}>Se creará el tanque “{nombreNuevoTanque}”.</p>}
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label htmlFor="tanque" className={styles.label}>
                    {esEmbotellado ? "Tanque de origen (lote)" : esEstado ? "Lote" : "Tanque"}
                  </label>
                  <select
                    id="tanque"
                    className={styles.input}
                    value={tanqueId}
                    onChange={(e) => {
                      setTanqueId(e.target.value);
                      setProductoId("");
                    }}
                    required
                  >
                    <option value="" disabled>
                      {cargando ? "Cargando tanques..." : "Selecciona un tanque..."}
                    </option>
                    {gruposTanques.map(({ linea, tanques: lista }) => (
                      <optgroup key={linea.id} label={linea.nombre}>
                        {lista.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} · {esEstado ? ETIQUETA_ESTADO[t.estado ?? "terminado"] : `${formatoLitros(saldos[t.id]?.esperado ?? 0)} L`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {esEmbotellado && gruposTanques.length === 0 && (
                  <p className={styles.hint}>No hay lotes terminados para embotellar. Aprueba un lote en la opción Estado.</p>
                )}

                {esEstado ? (
                  <div className={styles.field}>
                    <label htmlFor="estadoNuevo" className={styles.label}>
                      Nuevo estado{tanqueSel ? ` (hoy: ${ETIQUETA_ESTADO[estadoActual].toLowerCase()})` : ""}
                    </label>
                    <select
                      id="estadoNuevo"
                      className={styles.input}
                      value={estadoNuevo}
                      onChange={(e) => setEstadoNuevo(e.target.value as EstadoLote)}
                      disabled={!tanqueSel}
                      required
                    >
                      <option value="" disabled>
                        {tanqueSel ? "Selecciona el nuevo estado..." : "Primero elige el lote"}
                      </option>
                      {estadosPosibles.map((e) => (
                        <option key={e} value={e}>
                          {ETIQUETA_ESTADO[e]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : esEmbotellado ? (
                  <>
                    <div className={styles.row}>
                      <div className={styles.field}>
                        <label htmlFor="producto" className={styles.label}>
                          Producto
                        </label>
                        <select
                          id="producto"
                          className={styles.input}
                          value={productoId}
                          onChange={(e) => setProductoId(e.target.value)}
                          disabled={!tanqueSel}
                          required
                        >
                          <option value="" disabled>
                            {tanqueSel ? "Selecciona un producto..." : "Primero elige el tanque"}
                          </option>
                          {productosDelTanque.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="unidades" className={styles.label}>
                          Unidades embotelladas
                        </label>
                        <input
                          id="unidades"
                          className={styles.input}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="Ej. 80"
                          value={unidades}
                          onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))}
                          required
                        />
                      </div>
                    </div>
                    {productoSel && unidadesNum !== null && (
                      <p className={styles.hint}>
                        {formatoLitros(unidadesNum)} u. × {formatoLitros(productoSel.formato / 1000)} L = {formatoLitros(litrosCalculados ?? 0)} L a descontar.
                      </p>
                    )}
                  </>
                ) : (
                  <div className={styles.field}>
                    <label htmlFor="litros" className={styles.label}>
                      {esAjuste ? "Litros medidos realmente en el tanque" : "Litros"}
                    </label>
                    <input
                      id="litros"
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={esAjuste ? "Ej. 55" : "Ej. 150"}
                      value={esAjuste ? medido : litros}
                      onChange={(e) => (esAjuste ? setMedido : setLitros)(e.target.value.replace(/[^\d.,]/g, ""))}
                      required
                    />
                  </div>
                )}

                {tanqueSel && !esEstado && (
                  <div className={styles.resumen} aria-live="polite">
                    <div>
                      <span>{esAjuste ? "Nivel en el sistema" : "Saldo esperado hoy"}</span>
                      <strong>{formatoLitros(saldo ?? 0)} L</strong>
                    </div>
                    {esAjuste ? (
                      <div>
                        <span>Diferencia</span>
                        <strong
                          className={diferencia === null || diferencia === 0 ? undefined : diferencia > 0 ? styles.difPositiva : styles.difNegativa}
                        >
                          {diferencia === null ? "—" : diferencia === 0 ? "Sin diferencia" : conSignoLitros(diferencia)}
                        </strong>
                      </div>
                    ) : (
                      <div>
                        <span>Quedaría en</span>
                        <strong className={quedaria !== null && quedaria < 0 ? styles.difNegativa : undefined}>
                          {quedaria === null ? "—" : `${formatoLitros(quedaria)} L`}
                        </strong>
                        {quedaria !== null && quedaria < 0 && (
                          <span style={{ marginTop: 4, color: "var(--pachar-danger)" }}>
                            Supera el saldo esperado ({conSignoLitros(quedaria)}). Revisa si falta cargar un ingreso.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {tanqueSel && fechaIncluida && !esLoteNuevo && !esEstado && (
              <p className={styles.error} role="alert">
                {esAjuste ? "No se puede ajustar con esta fecha: " : "Atención: "}la última medición de este tanque es del{" "}
                {formatoFecha(baseFecha!)} y el sistema da por incluido en ella todo movimiento con fecha igual o anterior. Con la
                fecha {formatoFecha(fecha)} <strong>no cambiará el nivel del tanque</strong>. Si ocurrió después de medir, usa la
                fecha de hoy ({formatoFecha(hoyLocal())}).
              </p>
            )}
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="fecha" className={styles.label}>
                  Fecha
                </label>
                <input
                  id="fecha"
                  className={styles.input}
                  type="date"
                  max={hoyLocal()}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              {!esAjuste && !esEstado && (
                <div className={styles.field}>
                  <label htmlFor="numero" className={styles.label}>
                    N° de registro
                  </label>
                  <input
                    id="numero"
                    className={styles.input}
                    type="text"
                    autoComplete="off"
                    maxLength={50}
                    placeholder="Ej. 200"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="nota" className={styles.label}>
                Nota (opcional)
              </label>
              <input
                id="nota"
                className={styles.input}
                type="text"
                maxLength={200}
                placeholder={
                  esEstado
                    ? "Ej. aprobado por control de calidad"
                    : esAjuste
                    ? "Ej. medición con varilla, merma por evaporación"
                    : motivo === "otro"
                      ? "Ej. muestra para laboratorio, merma por evaporación"
                      : "Ej. Lote 29 de Matacuy"
                }
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
              {!esAjuste && !esEstado && (
                <p className={styles.hint}>El N° de registro se mantiene al guardar para que cargues las demás líneas de la misma operación.</p>
              )}
            </div>

            {mensaje && <p className={styles.success}>{mensaje}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={guardando}>
              {guardando ? "Guardando..." : esAjuste ? "Guardar ajuste" : esEstado ? "Guardar cambio de estado" : "Guardar movimiento"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
