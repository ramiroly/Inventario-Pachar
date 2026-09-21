import { useEffect, useMemo, useState } from "react";
import logoCerros from "../assets/logo-cerros.png";
import { api } from "../lib/api";
import { DESTINOS_HABITUALES } from "../lib/destinos";
import type { Linea, ProductoTerminado, TipoMovimiento } from "../types/models";
import styles from "./movimientos.module.css";

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

export function MovimientosFormPage() {
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productoId, setProductoId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoMovimiento>("salida");
  const [cantidad, setCantidad] = useState("");
  const [destino, setDestino] = useState<string>(DESTINOS_HABITUALES[0]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<ProductoTerminado[]>("/productos"), api.get<Linea[]>("/lineas")])
      .then(([p, l]) => {
        setProductos(p);
        setLineas(l);
      })
      .catch((e) => setError(mensajeError(e)));
  }, []);

  const grupos = useMemo(
    () =>
      [...lineas]
        .sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre))
        .map((linea) => ({ linea, items: productos.filter((p) => p.linea_id === linea.id) }))
        .filter((g) => g.items.length > 0),
    [lineas, productos]
  );

  const productoSel = productos.find((p) => p.id === productoId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    const unidades = Number(cantidad);
    if (!Number.isInteger(unidades) || unidades < 1) {
      setError("Ingresa una cantidad válida (mayor a 0).");
      return;
    }
    setGuardando(true);
    try {
      await api.post("/movimientos", {
        producto_id: productoId,
        fecha,
        tipo,
        cantidad: unidades,
        destino: tipo === "salida" ? destino : null,
      });
      const accion = tipo === "salida" ? "Salida" : "Entrada";
      setMensaje(
        `${accion} registrada: ${unidades.toLocaleString("es-PE")} u. de ${productoSel?.descripcion ?? "el producto"}.`
      );
      setCantidad("");
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
            <li>Las cantidades siempre se registran en unidades sueltas, no en cajas.</li>
          </ul>
        </aside>

        <main className={styles.main}>
          <h1 className={styles.titulo}>Cargar movimiento</h1>
          <p className={styles.subtitulo}>Registra una entrada o una salida de productos terminados.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo de movimiento</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Tipo de movimiento">
                {(["salida", "entrada"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t}
                    className={tipo === t ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
                    onClick={() => setTipo(t)}
                  >
                    {t === "salida" ? "Salida" : "Entrada"}
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
            </div>

            {tipo === "salida" && (
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
