import { useCallback, useEffect, useMemo, useState } from "react";
import logoCerros from "../assets/logo-cerros.png";
import { api } from "../lib/api";
import { DESTINOS_HABITUALES } from "../lib/destinos";
import type { Linea, ProductoTerminado } from "../types/models";
import styles from "./movimientos.module.css";

type Modo = "salida" | "entrada" | "ajuste";

const MODOS: { id: Modo; etiqueta: string }[] = [
  { id: "salida", etiqueta: "Salida" },
  { id: "entrada", etiqueta: "Entrada" },
  { id: "ajuste", etiqueta: "Ajuste" },
];

const ORDEN_LINEAS = ["Matacuy", "Salqa Azul", "Salqa Verde", "Añejo", "Reposado", "Cosecha", "Botanizado", "Licor de Café"];

function ordenLinea(nombre: string) {
  const i = ORDEN_LINEAS.indexOf(nombre);
  return i === -1 ? ORDEN_LINEAS.length : i;
}

function mensajeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  try {
    const detalle = JSON.parse(texto) as { fieldErrors?: Record<string, string[]> };
    const campos = Object.keys(detalle.fieldErrors ?? {});
    if (campos.length > 0) return `Revisa los datos ingresados (${campos.join(", ")}).`;
  } catch {
    // no era JSON: se muestra el texto tal cual
  }
  return texto;
}

const formatoUnidades = (n: number) => n.toLocaleString("es-PE");
const conSigno = (n: number) => (n > 0 ? `+${formatoUnidades(n)}` : formatoUnidades(n));

export function MovimientosFormPage() {
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [stockPorProducto, setStockPorProducto] = useState<Record<string, number>>({});
  const [productoId, setProductoId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [modo, setModo] = useState<Modo>("salida");
  const [cantidad, setCantidad] = useState("");
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
