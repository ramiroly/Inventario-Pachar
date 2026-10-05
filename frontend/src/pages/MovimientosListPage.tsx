import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import logoMarca from "../assets/logo-marca.png";
import { AnularDialog } from "../components/AnularDialog";
import { SubPestanas, SUBPESTANAS_MOVIMIENTOS } from "../components/SubPestanas";
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

// "EG07 - 520", "eg07-520" y "EG07 -520" son el mismo número.
const normalizarNumero = (n: string) => n.replace(/\s+/g, "").toUpperCase();

function formatoFecha(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

interface Fila {
  mov: MovimientoTerminado;
  producto?: ProductoTerminado;
  linea?: Linea;
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
  const [opciones, setOpciones] = useState<string[] | null>(null);
  const [anulando, setAnulando] = useState<Fila | null>(null);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
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
      if (ocultarAnulados && mov.anulado) return false;
      if (tipo !== "todos" && tipoDe(mov) !== tipo) return false;
      if (!q) return true;
      const campos = [mov.numero_documento, producto?.descripcion, mov.destino, mov.motivo, mov.anulado_motivo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return campos.includes(q);
    });
  }, [filas, texto, tipo, ocultarAnulados]);

  // Todos los movimientos con ese N° (los anulados no entran al comprobante).
  const delDocumento = useMemo(() => {
    if (!docSeleccionado) return [];
    const doc = docSeleccionado.trim();
    return filas.filter(({ mov }) => (mov.numero_documento ?? "").trim() === doc);
  }, [filas, docSeleccionado]);
  const lineasComprobante = useMemo(() => delDocumento.filter(({ mov }) => !mov.anulado), [delDocumento]);
  const lineasAnuladas = delDocumento.length - lineasComprobante.length;

  async function recargar() {
    setMovimientos(await api.get<MovimientoTerminado[]>("/movimientos"));
  }

  async function confirmarAnulacion(motivo: string) {
    if (!anulando) return;
    await api.patch(`/movimientos/${anulando.mov.id}/anular`, { motivo });
    setAnulando(null);
    await recargar();
  }

  function resumenAnulacion(f: Fila): string[] {
    const m = f.mov;
    return [
      `${ETIQUETA_TIPO[tipoDe(m)]} · ${formatoUnidades(m.cantidad)} u. de ${f.producto?.descripcion ?? "producto"}`,
      `Fecha: ${formatoFecha(m.fecha)}${m.destino ? ` · Destino: ${m.destino}` : ""}`,
      m.numero_documento ? `N° ${m.numero_documento}` : "Sin N° de documento",
    ];
  }

  function abrirComprobante(numero: string) {
    const doc = numero.trim();
    if (!doc) return;
    setOpciones(null);
    setParams({ doc });
  }

  // Basta escribir el número ("520") para encontrar "EG07 - 520". Si hay más de un
  // registro con ese número (por ejemplo otra serie), se deja elegir.
  function buscarComprobante(escrito: string) {
    const t = normalizarNumero(escrito);
    if (!t) return;
    const candidatos = [
      ...new Set(
        movimientos
          .filter((m) => !m.anulado)
          .map((m) => m.numero_documento)
          .filter((n): n is string => !!n)
          .filter((n) => {
            const x = normalizarNumero(n);
            return x === t || x.endsWith(`-${t}`);
          })
      ),
    ];
    if (candidatos.length === 1) abrirComprobante(candidatos[0]);
    else if (candidatos.length === 0) abrirComprobante(escrito);
    else setOpciones(candidatos);
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
              <p className={styles.vacio}>
                {lineasAnuladas > 0
                  ? `Todos los movimientos con el N° "${docSeleccionado}" están anulados.`
                  : `No hay movimientos con el N° de documento "${docSeleccionado}".`}
              </p>
            </div>
          ) : (
            <Comprobante numero={docSeleccionado} filas={lineasComprobante} anuladas={lineasAnuladas} generadoPor={session?.user.email ?? ""} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <SubPestanas opciones={SUBPESTANAS_MOVIMIENTOS} actual="/movimientos/registro" />
        <div className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Registro de movimientos</h1>
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
          <label className={styles.ocultar}>
            <input type="checkbox" checked={ocultarAnulados} onChange={(e) => setOcultarAnulados(e.target.checked)} />
            Ocultar anulados
          </label>
          <form
            className={styles.buscarDoc}
            onSubmit={(e) => {
              e.preventDefault();
              buscarComprobante(buscarDoc);
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
                placeholder="Ej. 520"
                value={buscarDoc}
                onChange={(e) => {
                  setBuscarDoc(e.target.value);
                  setOpciones(null);
                }}
              />
            </div>
            <button type="submit" className={styles.botonSecundario} disabled={!buscarDoc.trim()}>
              Ver
            </button>
          </form>
        </div>

        {opciones && (
          <div className={styles.opcionesDoc}>
            <span>Hay varios registros con ese número. Elige cuál ver:</span>
            {opciones.map((o) => (
              <button key={o} type="button" className={styles.botonSecundario} onClick={() => abrirComprobante(o)}>
                {o}
              </button>
            ))}
          </div>
        )}

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.map((fila) => {
                const { mov, producto, linea } = fila;
                return (
                <tr key={mov.id} className={mov.anulado ? styles.filaAnulada : undefined}>
                  <td>{formatoFecha(mov.fecha)}</td>
                  <td>
                    <span className={claseBadge(tipoDe(mov))}>{ETIQUETA_TIPO[tipoDe(mov)]}</span>
                  </td>
                  <td>{producto?.descripcion ?? "—"}</td>
                  <td>{linea?.nombre ?? "—"}</td>
                  <td>{formatoUnidades(mov.cantidad)} u.</td>
                  <td>
                    {mov.anulado ? (
                      <span className={styles.motivoAnulacion}>Anulado: {mov.anulado_motivo ?? "sin motivo"}</span>
                    ) : (
                      (mov.destino ?? mov.motivo ?? "—")
                    )}
                  </td>
                  <td>
                    {mov.numero_documento ? (
                      <button type="button" className={styles.docBtn} onClick={() => abrirComprobante(mov.numero_documento!)}>
                        {mov.numero_documento}
                      </button>
                    ) : (
                      <span className={styles.sinDoc}>—</span>
                    )}
                  </td>
                  <td>
                    {mov.anulado ? (
                      <span className={styles.badgeAnulado}>Anulado</span>
                    ) : (
                      <button type="button" className={styles.anularBtn} onClick={() => setAnulando(fila)}>
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {!cargando && filasFiltradas.length === 0 && (
            <p className={styles.vacio}>{error ?? "No hay movimientos que coincidan con la búsqueda."}</p>
          )}
          {cargando && <p className={styles.vacio}>Cargando...</p>}
        </div>
      </div>
      {anulando && (
        <AnularDialog resumen={resumenAnulacion(anulando)} onConfirmar={confirmarAnulacion} onCancelar={() => setAnulando(null)} />
      )}
    </div>
  );
}

function Comprobante({ numero, filas, anuladas, generadoPor }: { numero: string; filas: Fila[]; anuladas: number; generadoPor: string }) {
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

      {anuladas > 0 && (
        <p className={styles.notaAnuladas}>
          Se omitieron {anuladas} línea{anuladas > 1 ? "s" : ""} anulada{anuladas > 1 ? "s" : ""} de este N°.
        </p>
      )}

      <div className={styles.comprobanteFooter}>
        <span>Generado por {generadoPor || "—"}</span>
        <span>Impreso el {new Date().toLocaleString("es-PE")}</span>
      </div>
    </div>
  );
}
