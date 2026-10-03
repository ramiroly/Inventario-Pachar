import { useCallback, useEffect, useMemo, useState } from "react";
import logoCerros from "../assets/logo-cerros.png";
import { SubPestanas, SUBPESTANAS_LIQUIDOS } from "../components/SubPestanas";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { hoyLocal } from "../lib/fechas";
import { ordenLinea } from "../lib/lineas";
import { conSignoLitros, formatoLitros, parseLitros } from "../lib/numeros";
import type { EsperadoTanque, Linea, ProductoTerminado, TanqueLiquido } from "../types/models";
import styles from "./movimientos.module.css";

type Direccion = "egreso" | "ingreso";
type Motivo = "embotellado" | "lote" | "destilacion" | "otro" | "lote-nuevo";

const MOTIVOS: Record<Direccion, { id: Motivo; etiqueta: string }[]> = {
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
  const [lineaId, setLineaId] = useState("");
  const [loteTexto, setLoteTexto] = useState("");
  const [capacidad, setCapacidad] = useState("");
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

  const esEmbotellado = direccion === "egreso" && motivo === "embotellado";
  const esLoteNuevo = direccion === "ingreso" && motivo === "lote-nuevo";

  // Tanques elegibles: el embotellado solo sale de tanques terminados.
  const gruposTanques = useMemo(() => {
    const elegibles = esEmbotellado ? tanques.filter((t) => t.tipo === "terminado") : tanques;
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
  }, [tanques, lineasOrdenadas, esEmbotellado]);

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

  const loteNormalizado = /^\d+$/.test(loteTexto.trim()) ? `Lote ${loteTexto.trim()}` : loteTexto.trim();
  const lineaLote = lineaPorId.get(lineaId);
  const nombreNuevoTanque =
    lineaLote && loteNormalizado ? `${lineaLote.nombre.toLocaleUpperCase("es")} ${loteNormalizado.toLocaleUpperCase("es")} TERMINADO` : null;

  function cambiarDireccion(d: Direccion) {
    setDireccion(d);
    setMotivo(MOTIVOS[d][0].id);
    setTanqueId("");
    setProductoId("");
    setError(null);
    setMensaje(null);
  }

  function cambiarMotivo(m: Motivo) {
    setMotivo(m);
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
      const r = await api.post<{ tanque: TanqueLiquido }>("/movimientos-liquidos/lote-nuevo", {
        linea_id: lineaId,
        lote: loteTexto.trim(),
        capacidad_litros: cap,
        litros: l,
        ...comunes,
      });
      setMensaje(`Lote nuevo registrado: ${r.tanque.nombre} con ${formatoLitros(l)} L.`);
      setLoteTexto("");
      setLitros("");
      return;
    }

    if (!tanqueSel) throw new Error("Selecciona el tanque.");

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
            <li>Usa el mismo N° de registro en todas las líneas de una operación.</li>
            <li>El corte semanal sigue siendo la medida oficial: aquí solo se calcula lo que debería haber.</li>
          </ul>
        </aside>

        <main className={styles.main}>
          <h1 className={styles.titulo}>Movimiento de líquidos</h1>
          <p className={styles.subtitulo}>Registra una salida o un ingreso de litros en tus tanques.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo de movimiento</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Tipo de movimiento" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {(["egreso", "ingreso"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={direccion === d}
                    className={direccion === d ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
                    onClick={() => cambiarDireccion(d)}
                  >
                    {d === "egreso" ? "Salida" : "Ingreso"}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="motivo" className={styles.label}>
                Motivo
              </label>
              <select id="motivo" className={styles.input} value={motivo} onChange={(e) => cambiarMotivo(e.target.value as Motivo)}>
                {MOTIVOS[direccion].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>

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
                {nombreNuevoTanque && <p className={styles.hint}>Se creará el tanque “{nombreNuevoTanque}”.</p>}
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label htmlFor="tanque" className={styles.label}>
                    {esEmbotellado ? "Tanque de origen (lote)" : "Tanque"}
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
                            {t.nombre} · {formatoLitros(saldos[t.id]?.esperado ?? 0)} L
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {esEmbotellado ? (
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
                      Litros
                    </label>
                    <input
                      id="litros"
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Ej. 150"
                      value={litros}
                      onChange={(e) => setLitros(e.target.value.replace(/[^\d.,]/g, ""))}
                      required
                    />
                  </div>
                )}

                {tanqueSel && (
                  <div className={styles.resumen} aria-live="polite">
                    <div>
                      <span>Saldo esperado hoy</span>
                      <strong>{formatoLitros(saldo ?? 0)} L</strong>
                    </div>
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
                  </div>
                )}
              </>
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
                placeholder={motivo === "otro" ? "Ej. muestra para laboratorio, merma por evaporación" : "Ej. Lote 29 de Matacuy"}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
              <p className={styles.hint}>El N° de registro se mantiene al guardar para que cargues las demás líneas de la misma operación.</p>
            </div>

            {mensaje && <p className={styles.success}>{mensaje}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar movimiento"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
