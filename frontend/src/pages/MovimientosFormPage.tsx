import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DESTINOS_HABITUALES } from "../lib/destinos";
import type { ProductoTerminado } from "../types/models";

export function MovimientosFormPage() {
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [productoId, setProductoId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<"entrada" | "salida">("salida");
  const [cantidad, setCantidad] = useState(1);
  const [destino, setDestino] = useState(DESTINOS_HABITUALES[0]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ProductoTerminado[]>("/productos").then(setProductos).catch((e) => setError(e.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api.post("/movimientos", {
        producto_id: productoId,
        fecha,
        tipo,
        cantidad,
        destino: tipo === "salida" ? destino : null,
      });
      setMensaje("Movimiento cargado correctamente.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 420 }}>
      <h1>Cargar movimiento</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          Producto
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
            <option value="" disabled>
              Seleccioná un SKU...
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.descripcion}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>

        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "entrada" | "salida")}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </label>

        <label>
          Cantidad
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            required
          />
        </label>

        {tipo === "salida" && (
          <label>
            Destino
            <select value={destino} onChange={(e) => setDestino(e.target.value)}>
              {DESTINOS_HABITUALES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="submit">Guardar</button>
        {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    </div>
  );
}
