import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { RecoverPasswordPage } from "./pages/RecoverPasswordPage";
import { StockDashboardPage } from "./dashboards/stock/StockDashboardPage";
import { DashboardComparativoPage } from "./pages/DashboardComparativoPage";
import { DashboardLiquidosPage } from "./pages/DashboardLiquidosPage";
import { MovimientosFormPage } from "./pages/MovimientosFormPage";

// Links de invitación y recuperación de contraseña de Supabase redirigen acá
// con el token en el hash (#access_token=...&type=recovery) o en la query
// (?code=...&type=recovery), según el flujo configurado en el proyecto. Se
// chequea de forma síncrona, ANTES de que el router decida la ruta — si se
// hace en un useEffect, ProtectedRoute ya redirigió a /login (sin sesión
// todavía) antes de que supabase-js termine de procesar el token, y el
// replace de esa redirección borra el token de la URL.
function esCallbackDeAuth(): boolean {
  const params = window.location.hash + window.location.search;
  return params.includes("type=invite") || params.includes("type=recovery");
}

export default function App() {
  if (esCallbackDeAuth()) {
    return <SetPasswordPage />;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar" element={<RecoverPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <StockDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/comparativo"
          element={
            <ProtectedRoute>
              <DashboardComparativoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liquidos"
          element={
            <ProtectedRoute>
              <DashboardLiquidosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movimientos/nuevo"
          element={
            <ProtectedRoute rolRequerido="admin">
              <MovimientosFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
