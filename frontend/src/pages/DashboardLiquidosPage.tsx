import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { api } from "../lib/api";
import type { DashboardLiquidosResponse } from "../types/models";

export function DashboardLiquidosPage() {
  const [data, setData] = useState<DashboardLiquidosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardLiquidosResponse>("/dashboards/liquidos")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>Error cargando dashboard: {error}</p>;
  if (!data) return <p>Cargando...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Dashboard de líquidos — tanques por línea</h1>

      <h2>Participación (litros actuales)</h2>
      <div style={{ maxWidth: 360 }}>
        <Doughnut
          data={{
            labels: data.tanques.map((t) => t.nombre),
            datasets: [{ data: data.tanques.map((t) => t.litros_actual), backgroundColor: undefined }],
          }}
        />
      </div>

      <h2>Detalle por tanque</h2>
      <table>
        <thead>
          <tr>
            <th>Tanque</th>
            <th>Tipo</th>
            <th>Capacidad (L)</th>
            <th>Litros actuales</th>
            <th>Litros anteriores</th>
            <th>Δ</th>
            <th>Lote nuevo</th>
          </tr>
        </thead>
        <tbody>
          {data.tanques.map((t) => (
            <tr key={t.tanque_id}>
              <td>{t.nombre}</td>
              <td>{t.tipo}</td>
              <td>{t.capacidad_litros ?? "TODO: confirmar"}</td>
              <td>{t.litros_actual}</td>
              <td>{t.litros_anterior}</td>
              <td style={{ color: t.delta < 0 ? "crimson" : t.delta > 0 ? "green" : undefined }}>
                {t.delta > 0 ? "+" : ""}
                {t.delta}
              </td>
              <td>{t.lote_nuevo ? "Sí" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
