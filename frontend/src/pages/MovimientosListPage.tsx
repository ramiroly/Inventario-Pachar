import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import logoMarca from "../assets/logo-marca.png";
import { api } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import type { Linea, MovimientoTerminado, ProductoTerminado } from "../types/models";
import styles from "./movimientosList.module.css";

type FiltroTipo = "todos" | "entrada" | "salida" | "ajuste";

const ETIQUETA_TIPO: Record<"entrada" | "salida" | "ajuste", string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

function claseBadge(tipo: "entrada" | "salida" | "ajuste") {
  if (tipo === "entrada") return `${styles.badge} ${styles.badgeEntrada}`;
  if (tipo === "salida") return `${styles.badge} ${styles.badgeSalida}`;
  return `${styles.badge} ${styles.badgeAjuste}`;
}

function tipoDe(m: MovimientoTerminado): "entrada" | "salida" | "ajuste" {
  return m.es_ajuste ? "ajuste" : m.tipo;
}

const formatoUnidades = (n: number) => n.toLocaleString("es-PE");

function formatoFecha(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function MovimientosListPage() {
  const { session } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoTerminado[]>([]);
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [buscarDoc, setBuscarDoc] = useState("");
  const [params, setParams] = useSearchParams();
  const docSeleccionado = params.get("doc");

  useEffect(() => {
    Promise.all([
      api.get<MovimientoTerminado[]>("/movimientos"),
      api.get<ProductoTerminado[]>("/productos"),
      api.get<Linea[]>("/lineas"),
    ])
      .then(([mv, p, l]) => {
        setMovimientos(mv);
        setProductos(p);
        setLineas(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCargando(false));
  }, []);

  const productosPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const lineasPorId = useMemo(() => new Map(lineas.map((l) => [l.id, l])), [lineas]);

  const filas = useMemo(
    () =>
      movimientos.map((m) => {
        const producto = productosPorId.get(m.producto_id);
        const linea = producto ? lineasPorId.get(producto.linea_id) : undefined;
        return { mov: m, producto, linea };
      }),
    [movimientos, productosPorId, lineasPorId]
  );

  const filasFiltradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return filas.filter(({ mov, producto }) => {
      if (tipo !== "todos" && tipoDe(mov) !== tipo) return false;
      if (!q) return true;
      const campos = [mov.numero_documento, producto?.descripcion, mov.destino, mov.motivo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return campos.includes(q);
    });
  }, [filas, texto, tipo]);

  const lineasComprobante = useMemo(() => {
    if (!docSeleccionado) return [];
    const doc = docSeleccionado.trim();
    return filas.filter(({ mov }) => (mov.numero_documento ?? "").trim() === doc);
  }, [filas, docSeleccionado]);

  function abrirComprobante(numero: string) {
    const doc = numero.trim();
    if (!doc) return;
    setParams({ doc });
  }

  function cerrarComprobante() {
    setParams({});
  }

  if (docSeleccionado) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.comprobanteBarra}>
            <button type="button" className={styles.botonSecundario} onClick={cerrarComprobante}>
              ← Volver al listado
            </button>
            {lineasComprobante.length > 0 && (
              <button type="button" className={styles.botonSecundario} onClick={() => window.print()}>
                Imprimir
              </button>
            )}
          </div>

          {lineasComprobante.length === 0 ? (
            <div className={styles.comprobante}>
              <p className={styles.vacio}>No hay movimientos con el N° de documento "{docSeleccionado}".</p>
            </div>
          ) : (
            <Comprobante numero={docSeleccionado} filas={lineasComprobante} generadoPor={session?.user.email ?? ""} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Movimientos</h1>
            <p className={styles.subtitulo}>Historial de entradas, salidas y ajustes de productos terminados.</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="texto">
              Buscar
            </label>
            <input
              id="texto"
              className={styles.input}
              type="text"
              placeholder="Producto, destino, N° documento..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tipo">
              Tipo
            </label>
            <select id="tipo" className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value as FiltroTipo)}>
              <option value="todos">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <form
            className={styles.buscarDoc}
            onSubmit={(e) => {
              e.preventDefault();
              abrirComprobante(buscarDoc);
            }}
          >
            <div className={styles.field}>
              <label className={styles.label} htmlFor="buscarDoc">
                Ver comprobante N°
              </label>
              <input
                id="buscarDoc"
                className={styles.input}
                type="text"
                placeholder="Ej. 200"
                value={buscarDoc}
                onChange={(e) => setBuscarDoc(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.botonSecundario} disabled={!buscarDoc.trim()}>
              Ver
            </button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Línea</th>
                <th>Cantidad</th>
                <th>Destino / motivo</th>
                <th>N° documento</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.map(({ mov, producto, linea }) => (
                <tr key={mov.id}>
                  <td>{formatoFecha(mov.fecha)}</td>
                  <td>
                    <span className={claseBadge(tipoDe(mov))}>{ETIQUETA_TIPO[tipoDe(mov)]}</span>
                  </td>
                  <td>{producto?.descripcion ?? "—"}</td>
                  <td>{linea?.nombre ?? "—"}</td>
                  <td>{formatoUnidades(mov.cantidad)} u.</td>
                  <td>{mov.destino ?? mov.motivo ?? "—"}</td>
                  <td>
                    {mov.numero_documento ? (
                      <button type="button" className={styles.docBtn} onClick={() => abrirComprobante(mov.numero_documento!)}>
                        {mov.numero_documento}
                      </button>
                    ) : (
                      <span className={styles.sinDoc}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cargando && filasFiltradas.length === 0 && (
            <p className={styles.vacio}>{error ?? "No hay movimientos que coincidan con la búsqueda."}</p>
          )}
          {cargando && <p className={styles.vacio}>Cargando...</p>}
        </div>
      </div>
    </div>
  );
}

interface FilaComprobante {
  mov: MovimientoTerminado;
  producto?: ProductoTerminado;
  linea?: Linea;
}

function Comprobante({ numero, filas, generadoPor }: { numero: string; filas: FilaComprobante[]; generadoPor: string }) {
  const tipos = new Set(filas.map(({ mov }) => tipoDe(mov)));
  const tituloDocumento =
    tipos.size > 1
      ? "Comprobante de movimiento"
      : tipos.has("entrada")
        ? "Orden de producción / ingreso"
        : tipos.has("salida")
          ? "Guía de remisión interna"
          : "Comprobante de ajuste";

  const fechas = [...new Set(filas.map(({ mov }) => mov.fecha))].sort();
  const fechaTexto =
    fechas.length === 1 ? formatoFecha(fechas[0]) : `${formatoFecha(fechas[0])} – ${formatoFecha(fechas[fechas.length - 1])}`;

  const destinos = [...new Set(filas.map(({ mov }) => mov.destino).filter(Boolean))];
  const totalUnidades = filas.reduce((acc, { mov }) => acc + mov.cantidad, 0);

  return (
    <div className={`${styles.comprobante} comprobante-imprimible`}>
      <div className={styles.comprobanteHead}>
        <div>
          <img className={styles.comprobanteLogo} src={logoMarca} alt="Destilería Andina" />
        </div>
        <div style={{ textAlign: "right" }}>
          <p className={styles.comprobanteTitulo}>{tituloDocumento}</p>
          <p className={styles.comprobanteNumero}>N° {numero}</p>
        </div>
      </div>

      <div className={styles.comprobanteGrid}>
        <div className={styles.comprobanteDato}>
          <span>Fecha</span>
          <strong>{fechaTexto}</strong>
        </div>
        <div className={styles.comprobanteDato}>
          <span>Destino</span>
          <strong>{destinos.length > 0 ? destinos.join(", ") : "—"}</strong>
        </div>
        <div className={styles.comprobanteDato}>
          <span>Total de unidades</span>
          <strong>{formatoUnidades(totalUnidades)} u.</strong>
        </div>
      </div>

      <table className={styles.comprobanteTabla}>
        <thead>
          <tr>
            <th>Línea</th>
            <th>Producto</th>
            <th>Presentación</th>
            {tipos.size > 1 && <th>Tipo</th>}
            <th className={styles.numCol}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ mov, producto, linea }) => (
            <tr key={mov.id}>
              <td>{linea?.nombre ?? "—"}</td>
              <td>{producto?.descripcion ?? "—"}</td>
              <td>
                {producto
                  ? producto.tipo_envase === "unidad"
                    ? "Unidad"
                    : `${producto.upb} u/${producto.tipo_envase}`
                  : "—"}
              </td>
              {tipos.size > 1 && <td>{ETIQUETA_TIPO[tipoDe(mov)]}</td>}
              <td className={styles.numCol}>{formatoUnidades(mov.cantidad)} u.</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={tipos.size > 1 ? 4 : 3}>Total</td>
            <td className={styles.numCol}>{formatoUnidades(totalUnidades)} u.</td>
          </tr>
        </tfoot>
      </table>

      <div className={styles.comprobanteFooter}>
        <span>Generado por {generadoPor || "—"}</span>
        <span>Impreso el {new Date().toLocaleString("es-PE")}</span>
      </div>
    </div>
  );
}
