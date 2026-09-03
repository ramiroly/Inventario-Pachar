import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface DetalleFormato {
  producto_id: string;
  linea_id: string;
  descripcion: string;
  formato: number;
  stock_actual: number;
  stock_anterior: number;
  variacion: number;
}

interface ComparativoResponse {
  fecha_corte: string;
  fecha_corte_anterior: string;
  detalle_por_formato: DetalleFormato[];
}

export function DashboardComparativoPage() {
  const [data, setData] = useState<ComparativoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    api
      .get<ComparativoResponse>("/dashboards/comparativo")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data) return <p>Cargando...</p>;

  const filas = data.detalle_por_formato.filter((d) =>
    d.descripcion.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Dashboard comparativo — semana anterior vs actual</h1>
      <p>
        {data.fecha_corte_anterior} → {data.fecha_corte}
      </p>

      <input
        placeholder="Filtrar por SKU..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Formato</th>
            <th>Stock anterior</th>
            <th>Stock actual</th>
            <th>Variación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.producto_id}>
              <td>{f.descripcion}</td>
              <td>{f.formato} ml</td>
              <td>{f.stock_anterior}</td>
              <td>{f.stock_actual}</td>
              <td style={{ color: f.variacion < 0 ? "crimson" : f.variacion > 0 ? "green" : undefined }}>
                {f.variacion > 0 ? "+" : ""}
                {f.variacion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
