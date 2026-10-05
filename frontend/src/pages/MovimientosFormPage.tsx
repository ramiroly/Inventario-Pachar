import { useCallback, useEffect, useMemo, useState } from "react";
import logoCerros from "../assets/logo-cerros.png";
import { SubPestanas, SUBPESTANAS_MOVIMIENTOS } from "../components/SubPestanas";
import { api } from "../lib/api";
import { DESTINOS_HABITUALES } from "../lib/destinos";
import { mensajeError } from "../lib/errores";
import { hoyLocal } from "../lib/fechas";
import { ordenLinea } from "../lib/lineas";
import type { Linea, ProductoTerminado } from "../types/models";
import styles from "./movimientos.module.css";

type Modo = "salida" | "entrada" | "ajuste";

const MODOS: { id: Modo; etiqueta: string }[] = [
  { id: "salida", etiqueta: "Salida" },
  { id: "entrada", etiqueta: "Entrada" },
  { id: "ajuste", etiqueta: "Ajuste" },
];

const formatoUnidades = (n: number) => n.toLocaleString("es-PE");
const conSigno = (n: number) => (n > 0 ? `+${formatoUnidades(n)}` : formatoUnidades(n));

export function MovimientosFormPage() {
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [stockPorProducto, setStockPorProducto] = useState<Record<string, number>>({});
  const [productoId, setProductoId] = useState("");
  const [fecha, setFecha] = useState(hoyLocal);
  const [modo, setModo] = useState<Modo>("salida");
  const [cantidad, setCantidad] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [serie, setSerie] = useState<"EG07" | "otros">("EG07");
  const [numeroGuia, setNumeroGuia] = useState("");
  const [conteo, setConteo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [destino, setDestino] = useState<string>(DESTINOS_HABITUALES[0]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarStock = useCallback(
    () => api.get<Record<string, number>>("/productos/stock").then(setStockPorProducto),
    []
  );

  useEffect(() => {
    Promise.all([api.get<ProductoTerminado[]>("/productos"), api.get<Linea[]>("/lineas"), cargarStock()])
      .then(([p, l]) => {
        setProductos(p);
        setLineas(l);
      })
      .catch((e) => setError(mensajeError(e)));
  }, [cargarStock]);

  const grupos = useMemo(
    () =>
      [...lineas]
        .sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre))
        .map((linea) => ({ linea, items: productos.filter((p) => p.linea_id === linea.id) }))
        .filter((g) => g.items.length > 0),
    [lineas, productos]
  );

  const productoSel = productos.find((p) => p.id === productoId);
  const stockSistema = productoSel ? stockPorProducto[productoSel.id] ?? 0 : null;
  const conteoNum = conteo === "" ? null : Number(conteo);
  const diferencia = conteoNum !== null && stockSistema !== null ? conteoNum - stockSistema : null;

  async function guardarAjuste() {
    if (!productoSel || stockSistema === null) {
      setError("Selecciona un producto.");
      return;
    }
    if (conteoNum === null || !Number.isInteger(conteoNum) || conteoNum < 0) {
      setError("Ingresa el conteo físico real (0 o más unidades).");
      return;
    }
    const dif = conteoNum - stockSistema;
    if (dif === 0) {
      setError("El conteo coincide con el sistema: no hay nada que ajustar.");
      return;
    }
    await api.post("/movimientos", {
      producto_id: productoSel.id,
      fecha,
      tipo: dif > 0 ? "entrada" : "salida",
      cantidad: Math.abs(dif),
      destino: null,
      es_ajuste: true,
      motivo: motivo.trim() || null,
    });
    setMensaje(
      `Ajuste registrado: ${productoSel.descripcion} pasó de ${formatoUnidades(stockSistema)} a ${formatoUnidades(conteoNum)} u. (${conSigno(dif)} u.).`
    );
    setConteo("");
    setMotivo("");
  }

  // Las salidas llevan guía de remisión: con la serie EG07 se guarda "EG07 - 520";
  // con "Otros" se guarda tal cual lo escrito.
  const guiaCompleta = serie === "EG07" ? (numeroGuia.trim() ? `EG07 - ${numeroGuia.trim()}` : "") : numeroGuia.trim();

  async function guardarMovimiento() {
    const unidades = Number(cantidad);
    if (!Number.isInteger(unidades) || unidades < 1) {
      setError("Ingresa una cantidad válida (mayor a 0).");
      return;
    }
    await api.post("/movimientos", {
      producto_id: productoId,
      fecha,
      tipo: modo,
      cantidad: unidades,
      destino: modo === "salida" ? destino : null,
      numero_documento: (modo === "salida" ? guiaCompleta : numeroDocumento.trim()) || null,
    });
    const accion = modo === "salida" ? "Salida" : "Entrada";
    setMensaje(`${accion} registrada: ${formatoUnidades(unidades)} u. de ${productoSel?.descripcion ?? "el producto"}.`);
    setCantidad("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      if (modo === "ajuste") await guardarAjuste();
      else await guardarMovimiento();
      await cargarStock();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.page}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SubPestanas opciones={SUBPESTANAS_MOVIMIENTOS} actual="/movimientos/nuevo" />
      </div>
      <div className={styles.shell}>
        <aside className={styles.aside}>
          <img className={styles.logo} src={logoCerros} alt="Destilería Andina" />
          <p className={styles.asideTitulo}>Registro de movimientos</p>
          <ul className={styles.notas}>
            <li>
              <strong>Entrada:</strong> suma unidades al stock (producción o ingreso a almacén).
            </li>
            <li>
              <strong>Salida:</strong> descuenta del stock y requiere un destino.
            </li>
            <li>
              <strong>Ajuste:</strong> corrige el stock según tu conteo físico. No cuenta como despacho.
            </li>
            <li>Las cantidades siempre se registran en unidades sueltas, no en cajas.</li>
          </ul>
        </aside>

        <main className={styles.main}>
          <h1 className={styles.titulo}>Cargar movimiento</h1>
          <p className={styles.subtitulo}>Registra una entrada, una salida o un ajuste de productos terminados.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo de movimiento</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Tipo de movimiento">
                {MODOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={modo === m.id}
                    className={modo === m.id ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
                    onClick={() => {
                      setModo(m.id);
                      setError(null);
                      setMensaje(null);
                    }}
                  >
                    {m.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="producto" className={styles.label}>
                Producto
              </label>
              <select
                id="producto"
                className={styles.input}
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                required
              >
                <option value="" disabled>
                  {productos.length === 0 && !error ? "Cargando productos..." : "Selecciona un producto..."}
                </option>
                {grupos.map(({ linea, items }) => (
                  <optgroup key={linea.id} label={linea.nombre}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {productoSel && (
                <p className={styles.hint}>
                  {productoSel.tipo_envase === "unidad"
                    ? "Este producto se maneja por unidad."
                    : `Presentación: ${productoSel.upb} unidades por ${productoSel.tipo_envase}.`}
                </p>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="fecha" className={styles.label}>
                  Fecha
                </label>
                <input
                  id="fecha"
                  className={styles.input}
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              {modo === "ajuste" ? (
                <div className={styles.field}>
                  <label htmlFor="conteo" className={styles.label}>
                    Conteo físico real (unidades)
                  </label>
                  <input
                    id="conteo"
                    className={styles.input}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej. 240"
                    value={conteo}
                    onChange={(e) => setConteo(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="cantidad" className={styles.label}>
                    Cantidad (unidades)
                  </label>
                  <input
                    id="cantidad"
                    className={styles.input}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej. 1200"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              )}
            </div>

            {modo === "salida" && (
              <div className={styles.field}>
                <label htmlFor="numeroGuia" className={styles.label}>
                  N° de guía de remisión (opcional)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10 }}>
                  <select
                    id="serie"
                    aria-label="Serie de la guía"
                    className={styles.input}
                    value={serie}
                    onChange={(e) => {
                      setSerie(e.target.value as "EG07" | "otros");
                      setNumeroGuia("");
                    }}
                  >
                    <option value="EG07">EG07</option>
                    <option value="otros">Otros</option>
                  </select>
                  <input
                    id="numeroGuia"
                    className={styles.input}
                    type="text"
                    inputMode={serie === "EG07" ? "numeric" : "text"}
                    autoComplete="off"
                    maxLength={50}
                    placeholder={serie === "EG07" ? "Ej. 520" : "Número completo, ej. EG08 - 12"}
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(serie === "EG07" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                  />
                </div>
                <p className={styles.hint}>
                  {guiaCompleta
                    ? `Se guardará como: ${guiaCompleta}`
                    : "Usa el mismo número en varios productos para agruparlos en una sola guía."}
                </p>
              </div>
            )}

            {modo === "entrada" && (
              <div className={styles.field}>
                <label htmlFor="numeroDocumento" className={styles.label}>
                  N° de producción / orden (opcional)
                </label>
                <input
                  id="numeroDocumento"
                  className={styles.input}
                  type="text"
                  autoComplete="off"
                  placeholder="Ej. 200"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                />
                <p className={styles.hint}>
                  Usa el mismo número en varios productos para agruparlos en un solo comprobante.
                </p>
              </div>
            )}

            {modo === "salida" && (
              <div className={styles.field}>
                <label htmlFor="destino" className={styles.label}>
                  Destino
                </label>
                <select
                  id="destino"
                  className={styles.input}
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                >
                  {DESTINOS_HABITUALES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modo === "ajuste" && (
              <>
                <div className={styles.resumen} aria-live="polite">
                  <div>
                    <span>Stock en el sistema</span>
                    <strong>{stockSistema === null ? "—" : `${formatoUnidades(stockSistema)} u.`}</strong>
                  </div>
                  <div>
                    <span>Diferencia</span>
                    <strong
                      className={
                        diferencia === null || diferencia === 0
                          ? undefined
                          : diferencia > 0
                            ? styles.difPositiva
                            : styles.difNegativa
                      }
                    >
                      {diferencia === null ? "—" : diferencia === 0 ? "Sin diferencia" : `${conSigno(diferencia)} u.`}
                    </strong>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="motivo" className={styles.label}>
                    Motivo (opcional)
                  </label>
                  <input
                    id="motivo"
                    className={styles.input}
                    type="text"
                    maxLength={200}
                    placeholder="Ej. conteo de fin de mes, rotura"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>
              </>
            )}

            {mensaje && <p className={styles.success}>{mensaje}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={guardando}>
              {guardando ? "Guardando..." : modo === "ajuste" ? "Guardar ajuste" : "Guardar movimiento"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
