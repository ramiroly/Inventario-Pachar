import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import logoMarca from "../assets/logo-marca.png";
import { AnularDialog } from "../components/AnularDialog";
import { SubPestanas, SUBPESTANAS_LIQUIDOS } from "../components/SubPestanas";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { formatoFecha } from "../lib/fechas";
import { formatoLitros } from "../lib/numeros";
import { useAuth } from "../lib/useAuth";
import type { Linea, MotivoLiquido, MovimientoLiquido, ProductoTerminado, TanqueLiquido } from "../types/models";
import styles from "./movimientosList.module.css";

type FiltroTipo = "todos" | "ingreso" | "egreso";
type FiltroMotivo = "todos" | MotivoLiquido;

const ETIQUETA_MOTIVO: Record<MotivoLiquido, string> = {
  embotellado: "Embotellado",
  lote: "Lote",
  destilacion: "Destilación",
  otro: "Otro",
};

interface Fila {
  mov: MovimientoLiquido;
  tanque?: TanqueLiquido;
  linea?: Linea;
  producto?: ProductoTerminado;
}

const claseTipo = (tipo: MovimientoLiquido["tipo"]) =>
  `${styles.badge} ${tipo === "ingreso" ? styles.badgeEntrada : styles.badgeSalida}`;

const etiquetaTipo = (tipo: MovimientoLiquido["tipo"]) => (tipo === "ingreso" ? "Ingreso" : "Salida");

const litrosConSigno = (m: MovimientoLiquido) => `${m.tipo === "ingreso" ? "+" : "−"}${formatoLitros(Number(m.litros))} L`;

function detalle(f: Fila): string {
  if (f.mov.motivo === "embotellado" && f.producto && f.mov.unidades) {
    return `${formatoLitros(f.mov.unidades)} u. de ${f.producto.descripcion}`;
  }
  return f.mov.nota ?? "—";
}

export function MovimientosLiquidosListPage() {
  const { session } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoLiquido[]>([]);
  const [tanques, setTanques] = useState<TanqueLiquido[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [motivo, setMotivo] = useState<FiltroMotivo>("todos");
  const [buscarDoc, setBuscarDoc] = useState("");
  const [anulando, setAnulando] = useState<Fila | null>(null);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [params, setParams] = useSearchParams();
  const docSeleccionado = params.get("doc");

  useEffect(() => {
    Promise.all([
      api.get<MovimientoLiquido[]>("/movimientos-liquidos"),
      api.get<TanqueLiquido[]>("/tanques"),
      api.get<Linea[]>("/lineas"),
      api.get<ProductoTerminado[]>("/productos"),
    ])
      .then(([m, t, l, p]) => {
        setMovimientos(m);
        setTanques(t);
        setLineas(l);
        setProductos(p);
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  const tanquePorId = useMemo(() => new Map(tanques.map((t) => [t.id, t])), [tanques]);
  const lineaPorId = useMemo(() => new Map(lineas.map((l) => [l.id, l])), [lineas]);
  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const filas: Fila[] = useMemo(
    () =>
      movimientos.map((mov) => {
        const tanque = tanquePorId.get(mov.tanque_id);
        return {
          mov,
          tanque,
          linea: tanque ? lineaPorId.get(tanque.linea_id) : undefined,
          producto: mov.producto_id ? productoPorId.get(mov.producto_id) : undefined,
        };
      }),
    [movimientos, tanquePorId, lineaPorId, productoPorId]
  );

  const filasFiltradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return filas.filter((f) => {
      if (ocultarAnulados && f.mov.anulado) return false;
      if (tipo !== "todos" && f.mov.tipo !== tipo) return false;
      if (motivo !== "todos" && f.mov.motivo !== motivo) return false;
      if (!q) return true;
      return [f.mov.numero_documento, f.tanque?.nombre, f.linea?.nombre, f.producto?.descripcion, f.mov.nota, f.mov.anulado_motivo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filas, texto, tipo, motivo, ocultarAnulados]);

  // Todos los movimientos con ese N° (los anulados no entran al comprobante).
  const delDocumento = useMemo(() => {
    if (!docSeleccionado) return [];
    const doc = docSeleccionado.trim();
    return filas.filter((f) => (f.mov.numero_documento ?? "").trim() === doc);
  }, [filas, docSeleccionado]);
  const lineasComprobante = useMemo(() => delDocumento.filter((f) => !f.mov.anulado), [delDocumento]);
  const lineasAnuladas = delDocumento.length - lineasComprobante.length;

  async function recargar() {
    setMovimientos(await api.get<MovimientoLiquido[]>("/movimientos-liquidos"));
  }

  async function confirmarAnulacion(motivoAnulacion: string) {
    if (!anulando) return;
    await api.patch(`/movimientos-liquidos/${anulando.mov.id}/anular`, { motivo: motivoAnulacion });
    setAnulando(null);
    await recargar();
  }

  function resumenAnulacion(f: Fila): string[] {
    const m = f.mov;
    return [
      `${etiquetaTipo(m.tipo)} · ${litrosConSigno(m)} · ${ETIQUETA_MOTIVO[m.motivo]}`,
      `${f.tanque?.nombre ?? "Tanque"} · ${formatoFecha(m.fecha)}`,
      m.numero_documento ? `N° ${m.numero_documento}` : "Sin N° de registro",
    ];
  }

  function abrirComprobante(numero: string) {
    const doc = numero.trim();
    if (doc) setParams({ doc });
  }

  if (docSeleccionado) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.comprobanteBarra}>
            <button type="button" className={styles.botonSecundario} onClick={() => setParams({})}>
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
                  : `No hay movimientos de líquidos con el N° de registro "${docSeleccionado}".`}
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
        <SubPestanas opciones={SUBPESTANAS_LIQUIDOS} actual="/liquidos/cargar/registro" />
        <div className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Registro de líquidos</h1>
            <p className={styles.subtitulo}>Historial de ingresos y salidas de litros en los tanques.</p>
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
              placeholder="Tanque, producto, N° registro..."
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
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Salida</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="motivo">
              Motivo
            </label>
            <select id="motivo" className={styles.select} value={motivo} onChange={(e) => setMotivo(e.target.value as FiltroMotivo)}>
              <option value="todos">Todos</option>
              {(Object.keys(ETIQUETA_MOTIVO) as MotivoLiquido[]).map((m) => (
                <option key={m} value={m}>
                  {ETIQUETA_MOTIVO[m]}
                </option>
              ))}
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
                <th>Motivo</th>
                <th>Tanque</th>
                <th>Línea</th>
                <th>Litros</th>
                <th>Detalle</th>
                <th>N° registro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.map((f) => (
                <tr key={f.mov.id} className={f.mov.anulado ? styles.filaAnulada : undefined}>
                  <td>{formatoFecha(f.mov.fecha)}</td>
                  <td>
                    <span className={claseTipo(f.mov.tipo)}>{etiquetaTipo(f.mov.tipo)}</span>
                  </td>
                  <td>{ETIQUETA_MOTIVO[f.mov.motivo]}</td>
                  <td>{f.tanque?.nombre ?? "—"}</td>
                  <td>{f.linea?.nombre ?? "—"}</td>
                  <td>{litrosConSigno(f.mov)}</td>
                  <td className={styles.celdaDetalle}>
                    {f.mov.anulado ? (
                      <span className={styles.motivoAnulacion}>Anulado: {f.mov.anulado_motivo ?? "sin motivo"}</span>
                    ) : (
                      detalle(f)
                    )}
                  </td>
                  <td>
                    {f.mov.numero_documento ? (
                      <button type="button" className={styles.docBtn} onClick={() => abrirComprobante(f.mov.numero_documento!)}>
                        {f.mov.numero_documento}
                      </button>
                    ) : (
                      <span className={styles.sinDoc}>—</span>
                    )}
                  </td>
                  <td>
                    {f.mov.anulado ? (
                      <span className={styles.badgeAnulado}>Anulado</span>
                    ) : (
                      <button type="button" className={styles.anularBtn} onClick={() => setAnulando(f)}>
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cargando && <p className={styles.vacio}>Cargando...</p>}
          {!cargando && error && <p className={styles.vacio}>{error}</p>}
          {!cargando && !error && filasFiltradas.length === 0 && (
            <p className={styles.vacio}>
              {movimientos.length === 0
                ? "Todavía no hay movimientos de líquidos. Regístralos en Cargar líquidos → Movimiento."
                : "No hay movimientos que coincidan con la búsqueda."}
            </p>
          )}
        </div>
      </div>
      {anulando && (
        <AnularDialog resumen={resumenAnulacion(anulando)} onConfirmar={confirmarAnulacion} onCancelar={() => setAnulando(null)} />
      )}
    </div>
  );
}

function Comprobante({ numero, filas, anuladas, generadoPor }: { numero: string; filas: Fila[]; anuladas: number; generadoPor: string }) {
  const motivos = new Set(filas.map((f) => f.mov.motivo));
  const titulo =
    motivos.size === 1 && motivos.has("embotellado")
      ? "Registro de embotellado"
      : motivos.has("lote")
        ? "Registro de preparación de lote"
        : motivos.has("destilacion")
          ? "Registro de destilación"
          : "Registro de movimientos de líquidos";

  const salidas = filas.filter((f) => f.mov.tipo === "egreso");
  const ingresos = filas.filter((f) => f.mov.tipo === "ingreso");
  const suma = (lista: Fila[]) => Math.round(lista.reduce((acc, f) => acc + Number(f.mov.litros), 0) * 1000) / 1000;
  const ordenadas = [...salidas, ...ingresos];

  const fechas = [...new Set(filas.map((f) => f.mov.fecha))].sort();
  const fechaTexto =
    fechas.length === 1 ? formatoFecha(fechas[0]) : `${formatoFecha(fechas[0])} – ${formatoFecha(fechas[fechas.length - 1])}`;

  return (
    <div className={`${styles.comprobante} comprobante-imprimible`}>
      <div className={styles.comprobanteHead}>
        <div>
          <img className={styles.comprobanteLogo} src={logoMarca} alt="Destilería Andina" />
        </div>
        <div style={{ textAlign: "right" }}>
          <p className={styles.comprobanteTitulo}>{titulo}</p>
          <p className={styles.comprobanteNumero}>N° {numero}</p>
        </div>
      </div>

      <div className={styles.comprobanteGrid}>
        <div className={styles.comprobanteDato}>
          <span>Fecha</span>
          <strong>{fechaTexto}</strong>
        </div>
        <div className={styles.comprobanteDato}>
          <span>Litros que salen</span>
          <strong>{salidas.length > 0 ? `${formatoLitros(suma(salidas))} L` : "—"}</strong>
        </div>
        <div className={styles.comprobanteDato}>
          <span>Litros que entran</span>
          <strong>{ingresos.length > 0 ? `${formatoLitros(suma(ingresos))} L` : "—"}</strong>
        </div>
      </div>

      <table className={styles.comprobanteTabla}>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Tanque</th>
            <th>Línea</th>
            <th>Detalle</th>
            <th className={styles.numCol}>Litros</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => (
            <tr key={f.mov.id}>
              <td>{etiquetaTipo(f.mov.tipo)}</td>
              <td>{f.tanque?.nombre ?? "—"}</td>
              <td>{f.linea?.nombre ?? "—"}</td>
              <td>
                {ETIQUETA_MOTIVO[f.mov.motivo]}
                {detalle(f) !== "—" ? ` · ${detalle(f)}` : ""}
              </td>
              <td className={styles.numCol}>{litrosConSigno(f.mov)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {salidas.length > 0 && (
            <tr>
              <td colSpan={4}>Total salidas</td>
              <td className={styles.numCol}>−{formatoLitros(suma(salidas))} L</td>
            </tr>
          )}
          {ingresos.length > 0 && (
            <tr>
              <td colSpan={4}>Total ingresos</td>
              <td className={styles.numCol}>+{formatoLitros(suma(ingresos))} L</td>
            </tr>
          )}
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
