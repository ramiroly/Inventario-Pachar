import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { mensajeError } from "../lib/errores";
import { formatoFecha, hoyLocal } from "../lib/fechas";
import { ordenLinea } from "../lib/lineas";
import type { Linea, StockLiquidoSnapshot, TanqueLiquido } from "../types/models";
import styles from "./liquidosForm.module.css";

const formatoLitros = (n: number) => n.toLocaleString("es-PE");

function parseLitros(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

interface Lectura {
  fecha: string;
  litros: number;
}

export function LiquidosFormPage() {
  const [tanques, setTanques] = useState<TanqueLiquido[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [snapshots, setSnapshots] = useState<StockLiquidoSnapshot[]>([]);
  const [cargando, setCargando] = useState(true);

  const [fecha, setFecha] = useState(hoyLocal);
  const [litros, setLitros] = useState<Record<string, string>>({});
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [agregandoEn, setAgregandoEn] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCapacidad, setNuevaCapacidad] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const [t, l, s] = await Promise.all([
      api.get<TanqueLiquido[]>("/tanques"),
      api.get<Linea[]>("/lineas"),
      api.get<StockLiquidoSnapshot[]>("/snapshots"),
    ]);
    setTanques(t);
    setLineas(l);
    setSnapshots(s);
  }, []);

  useEffect(() => {
    cargar()
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, [cargar]);

  const historial = useMemo(() => {
    const m = new Map<string, Lectura[]>();
    for (const s of snapshots) {
      const lista = m.get(s.tanque_id) ?? [];
      lista.push({ fecha: s.fecha_corte, litros: Number(s.litros) });
      m.set(s.tanque_id, lista);
    }
    for (const lista of m.values()) lista.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return m;
  }, [snapshots]);

  const cortes = useMemo(() => [...new Set(snapshots.map((s) => s.fecha_corte))].sort().reverse(), [snapshots]);
  const ultimoCorte = cortes[0] ?? null;
  const corteExistente = cortes.includes(fecha);

  // Lectura más reciente ANTERIOR a la fecha elegida (contra lo que se compara).
  const anteriorDe = useCallback(
    (tanqueId: string) => (historial.get(tanqueId) ?? []).find((h) => h.fecha < fecha) ?? null,
    [historial, fecha]
  );

  // Valor inicial de cada casilla: el de esa fecha si ya existe, o el último conocido.
  const valorInicial = useCallback(
    (tanqueId: string) => {
      const lista = historial.get(tanqueId) ?? [];
      const exacto = lista.find((h) => h.fecha === fecha);
      return (exacto ?? lista.find((h) => h.fecha < fecha))?.litros ?? null;
    },
    [historial, fecha]
  );

  // Solo al cambiar la fecha (o terminar de cargar): no pisa lo que se está escribiendo.
  useEffect(() => {
    if (cargando) return;
    const l: Record<string, string> = {};
    const lo: Record<string, string> = {};
    for (const t of tanques) {
      const v = valorInicial(t.id);
      l[t.id] = v === null ? "" : String(v);
      lo[t.id] = t.lote ?? "";
    }
    setLitros(l);
    setLotes(lo);
    setMensaje(null);
    setError(null);
  }, [fecha, cargando]);

  const grupos = useMemo(
    () =>
      [...lineas]
        .sort((a, b) => ordenLinea(a.nombre) - ordenLinea(b.nombre))
        .map((linea) => {
          const delaLinea = tanques.filter((t) => t.linea_id === linea.id);
          return {
            linea,
            terminado: delaLinea.find((t) => t.tipo === "terminado") ?? null,
            subs: delaLinea.filter((t) => t.tipo === "subproducto").sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
          };
        })
        .filter((g) => g.terminado || g.subs.length > 0),
    [lineas, tanques]
  );

  const resumen = useMemo(() => {
    let conCambios = 0;
    let sinValor = 0;
    let totalTerminados = 0;
    for (const t of tanques) {
      const v = parseLitros(litros[t.id] ?? "");
      if (v === null) {
        sinValor += 1;
        continue;
      }
      const ant = anteriorDe(t.id);
      if (!ant || ant.litros !== v) conCambios += 1;
      if (t.tipo === "terminado") totalTerminados += v;
    }
    return { conCambios, sinValor, totalTerminados };
  }, [tanques, litros, anteriorDe]);

  async function guardar() {
    setError(null);
    setMensaje(null);
    if (!fecha || fecha > hoyLocal()) {
      setError("La fecha de corte no puede ser futura.");
      return;
    }
    const faltan = tanques.filter((t) => parseLitros(litros[t.id] ?? "") === null);
    if (faltan.length > 0) {
      const nombres = faltan.slice(0, 3).map((t) => t.nombre).join(", ");
      setError(
        `Faltan litros en ${faltan.length} tanque${faltan.length > 1 ? "s" : ""} (${nombres}${faltan.length > 3 ? "…" : ""}). Escribe 0 si está vacío.`
      );
      return;
    }
    setGuardando(true);
    try {
      const items = tanques.map((t) => {
        const lote = (lotes[t.id] ?? "").trim();
        const cambioLote = t.tipo === "terminado" && lote !== (t.lote ?? "");
        return {
          tanque_id: t.id,
          litros: parseLitros(litros[t.id])!,
          ...(cambioLote ? { lote: lote || null } : {}),
        };
      });
      await api.post("/snapshots/corte", { fecha_corte: fecha, items });
      await cargar();
      setMensaje(`Corte del ${formatoFecha(fecha)} guardado (${items.length} tanques).`);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  async function agregarTanque(lineaId: string) {
    setError(null);
    const capacidad = parseLitros(nuevaCapacidad);
    if (!nuevoNombre.trim() || capacidad === null || capacidad <= 0) {
      setError("Para agregar un tanque escribe su nombre y una capacidad mayor a 0.");
      return;
    }
    setCreando(true);
    try {
      await api.post("/tanques", {
        linea_id: lineaId,
        nombre: nuevoNombre.trim().toLocaleUpperCase("es"),
        tipo: "subproducto",
        capacidad_litros: capacidad,
      });
      await cargar();
      setAgregandoEn(null);
      setNuevoNombre("");
      setNuevaCapacidad("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCreando(false);
    }
  }

  function filaTanque(t: TanqueLiquido) {
    const valor = parseLitros(litros[t.id] ?? "");
    const ant = anteriorDe(t.id);
    const excede = valor !== null && t.capacidad_litros !== null && valor > t.capacidad_litros;
    const cambio = valor !== null && (!ant || ant.litros !== valor);

    let deltaTexto = "";
    let deltaClase = styles.deltaNeutro;
    if (valor !== null && ant) {
      const delta = valor - ant.litros;
      if (ant.litros === 0 && valor > 0) {
        deltaTexto = "Nuevo lote";
        deltaClase = styles.deltaNuevo;
      } else if (delta === 0) {
        deltaTexto = "Sin cambio";
      } else {
        deltaTexto = `${delta > 0 ? "+" : ""}${formatoLitros(delta)} L`;
        deltaClase = delta > 0 ? styles.deltaSube : styles.deltaBaja;
      }
    } else if (valor !== null) {
      deltaTexto = "Primer registro";
    }

    return (
      <div key={t.id} className={cambio ? `${styles.fila} ${styles.filaCambio}` : styles.fila}>
        <div className={styles.filaInfo}>
          <span className={styles.nombre}>{t.nombre}</span>
          <span className={styles.meta}>
            Cap. {t.capacidad_litros === null ? "sin definir" : `${formatoLitros(t.capacidad_litros)} L`} · Anterior{" "}
            {ant ? `${formatoLitros(ant.litros)} L` : "—"}
          </span>
          {excede && <span className={styles.aviso}>Supera la capacidad del tanque</span>}
          {t.tipo === "terminado" && (
            <label className={styles.loteWrap}>
              <span>Lote</span>
              <input
                className={styles.loteInput}
                type="text"
                maxLength={60}
                placeholder="Ej. Lote 28"
                value={lotes[t.id] ?? ""}
                onChange={(e) => setLotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
              />
            </label>
          )}
          {t.tipo === "terminado" && (lotes[t.id] ?? "").trim() !== (t.lote ?? "") && (
            <span className={styles.meta}>Al guardar, el nombre del tanque tomará este lote.</span>
          )}
        </div>
        <div className={styles.filaValor}>
          <div className={styles.inputWrap}>
            <input
              className={valor === null && (litros[t.id] ?? "") !== "" ? `${styles.input} ${styles.inputMal}` : styles.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label={`Litros de ${t.nombre}`}
              placeholder="0"
              value={litros[t.id] ?? ""}
              onChange={(e) => setLitros((prev) => ({ ...prev, [t.id]: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <span className={styles.unidad}>L</span>
          </div>
          <span className={deltaClase}>{deltaTexto}</span>
        </div>
      </div>
    );
  }

  let aviso: { clase: string; texto: string } | null = null;
  if (corteExistente) {
    aviso = {
      clase: styles.avisoInfo,
      texto: `Ya existe un corte con la fecha ${formatoFecha(fecha)}. Se cargaron sus valores; al guardar se actualizarán.`,
    };
  } else if (ultimoCorte && fecha < ultimoCorte) {
    aviso = {
      clase: styles.avisoAdvertencia,
      texto: `Esta fecha es anterior al último corte (${formatoFecha(ultimoCorte)}). El dashboard de Líquidos siempre muestra el corte más reciente, así que este quedará solo como historial.`,
    };
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Cargar líquidos</h1>
            <p className={styles.subtitulo}>
              Litros de cada tanque en la fecha de corte.{" "}
              {ultimoCorte ? `Último corte cargado: ${formatoFecha(ultimoCorte)}.` : "Aún no hay cortes cargados."}
            </p>
          </div>
          <div className={styles.fechaBox}>
            <label htmlFor="fecha" className={styles.label}>
              Fecha de corte
            </label>
            <input
              id="fecha"
              className={styles.fechaInput}
              type="date"
              max={hoyLocal()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </header>

        {aviso && <p className={aviso.clase}>{aviso.texto}</p>}
        {mensaje && <p className={styles.exito}>{mensaje}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {cargando ? (
          <p className={styles.cargando}>Cargando tanques...</p>
        ) : (
          <div className={styles.grid}>
            {grupos.map(({ linea, terminado, subs }) => (
              <section key={linea.id} className={styles.card}>
                <h2 className={styles.cardTitulo} style={{ background: linea.color_dark ?? "#374151" }}>
                  {linea.nombre}
                </h2>
                {terminado && (
                  <div className={styles.bloque}>
                    <p className={styles.bloqueTitulo}>Terminado</p>
                    {filaTanque(terminado)}
                  </div>
                )}
                <div className={styles.bloque}>
                  <p className={styles.bloqueTitulo}>Subproductos</p>
                  {subs.map(filaTanque)}
                  {subs.length === 0 && <p className={styles.vacio}>Sin subproductos.</p>}

                  {agregandoEn === linea.id ? (
                    <div className={styles.nuevo}>
                      <input
                        className={styles.nuevoInput}
                        type="text"
                        placeholder="Nombre del tanque"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                      />
                      <input
                        className={`${styles.nuevoInput} ${styles.nuevoCap}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="Capacidad (L)"
                        value={nuevaCapacidad}
                        onChange={(e) => setNuevaCapacidad(e.target.value.replace(/[^\d.,]/g, ""))}
                      />
                      <button type="button" className={styles.botonChico} disabled={creando} onClick={() => agregarTanque(linea.id)}>
                        {creando ? "Agregando..." : "Agregar"}
                      </button>
                      <button
                        type="button"
                        className={styles.botonLink}
                        onClick={() => {
                          setAgregandoEn(null);
                          setNuevoNombre("");
                          setNuevaCapacidad("");
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.botonLink}
                      onClick={() => {
                        setAgregandoEn(linea.id);
                        setNuevoNombre("");
                        setNuevaCapacidad("");
                      }}
                    >
                      + Agregar subproducto
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {!cargando && (
          <div className={styles.barra}>
            <div className={styles.barraResumen}>
              <span>
                <strong>{tanques.length}</strong> tanques
              </span>
              <span>
                <strong>{resumen.conCambios}</strong> con cambios
              </span>
              {resumen.sinValor > 0 && (
                <span className={styles.barraFalta}>
                  <strong>{resumen.sinValor}</strong> sin litros
                </span>
              )}
              <span>
                Terminados: <strong>{formatoLitros(resumen.totalTerminados)} L</strong>
              </span>
            </div>
            <button type="button" className={styles.boton} disabled={guardando} onClick={guardar}>
              {guardando ? "Guardando..." : corteExistente ? "Actualizar corte" : "Guardar corte"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
