import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { api } from "../lib/api";
import type { DashboardStockResponse } from "../types/models";

const SEMAFORO_EMOJI: Record<string, string> = { rojo: "🔴", naranja: "🟠", verde: "🟢" };

export function DashboardStockPage() {
  const [data, setData] = useState<DashboardStockResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardStockResponse>("/dashboards/stock")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data) return <p>Cargando...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Dashboard de stock — terminados</h1>
      <p>
        Período: {data.periodo.desde} → {data.periodo.hasta} ({data.periodo.dias} días)
      </p>

      <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
        <div>
          <strong>Stock total</strong>
          <p>{data.kpis.stock_total}</p>
        </div>
        <div>
          <strong>Salidas del período</strong>
          <p>{data.kpis.salidas_periodo_total}</p>
        </div>
      </div>

      <h2>Cobertura por línea</h2>
      <table>
        <thead>
          <tr>
            <th>Línea</th>
            <th>Stock</th>
            <th>Cobertura (sem.)</th>
            <th>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {data.cobertura_por_linea.map((l) => (
            <tr key={l.linea_id}>
              <td>{l.nombre}</td>
              <td>{l.stock}</td>
              <td>{l.cobertura_semanas?.toFixed(1) ?? "—"}</td>
              <td>{SEMAFORO_EMOJI[l.semaforo]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Stock por línea (gráfico apilado)</h2>
      <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
        Nota: Matacuy 700ml exportación no se incluye acá (ver tabla ejecutiva más abajo), por
        decisión de Ramiro.
      </p>
      <Bar
        data={{
          labels: data.cobertura_por_linea.map((l) => l.nombre),
          datasets: [
            {
              label: "Stock",
              data: data.cobertura_por_linea.map((l) => l.stock),
              backgroundColor: "#60a5fa",
            },
          ],
        }}
      />

      <h2>Tabla ejecutiva — semáforo por SKU</h2>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Stock</th>
            <th>Cajas</th>
            <th>Sueltas</th>
            <th>Cobertura (sem.)</th>
            <th>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {data.semaforo_por_sku.map((s) => (
            <tr key={s.producto_id}>
              <td>{s.descripcion}</td>
              <td>{s.stock}</td>
              <td>{s.cajas}</td>
              <td>{s.sueltas}</td>
              <td>{s.cobertura_semanas?.toFixed(1) ?? "—"}</td>
              <td>{SEMAFORO_EMOJI[s.semaforo]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Salidas por destino</h2>
      <ul>
        {Object.entries(data.salidas_por_destino).map(([destino, cantidad]) => (
          <li key={destino}>
            {destino}: {cantidad}
          </li>
        ))}
      </ul>
    </div>
  );
}
