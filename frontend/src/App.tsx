import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./lib/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { RecoverPasswordPage } from "./pages/RecoverPasswordPage";
import { StockDashboardPage } from "./dashboards/stock/StockDashboardPage";
import { ComparativoDashboardPage } from "./dashboards/comparativo/ComparativoDashboardPage";
import { LiquidosDashboardPage } from "./dashboards/liquidos/LiquidosDashboardPage";
import { MovimientosFormPage } from "./pages/MovimientosFormPage";
import { MovimientosListPage } from "./pages/MovimientosListPage";
import { LiquidosCortePage } from "./pages/LiquidosCortePage";
import { LiquidosMovimientoPage } from "./pages/LiquidosMovimientoPage";
import { MovimientosLiquidosListPage } from "./pages/MovimientosLiquidosListPage";

// Página de entrada ("/"): a los admin los lleva directo a Cargar movimiento
// (su primera tarea del día); a los socios, a Stock.
function Inicio() {
  const { rol } = useAuth();
  return <Navigate to={rol === "admin" ? "/movimientos/nuevo" : "/stock"} replace />;
}

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
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
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
              <ComparativoDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liquidos"
          element={
            <ProtectedRoute>
              <LiquidosDashboardPage />
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
        <Route path="/liquidos/nuevo" element={<Navigate to="/liquidos/cargar/corte" replace />} />
        <Route path="/liquidos/cargar" element={<Navigate to="/liquidos/cargar/movimiento" replace />} />
        <Route
          path="/liquidos/cargar/movimiento"
          element={
            <ProtectedRoute rolRequerido="admin">
              <LiquidosMovimientoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liquidos/cargar/registro"
          element={
            <ProtectedRoute rolRequerido="admin">
              <MovimientosLiquidosListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liquidos/cargar/corte"
          element={
            <ProtectedRoute rolRequerido="admin">
              <LiquidosCortePage />
            </ProtectedRoute>
          }
        />
        <Route path="/movimientos" element={<Navigate to="/movimientos/nuevo" replace />} />
        <Route
          path="/movimientos/registro"
          element={
            <ProtectedRoute rolRequerido="admin">
              <MovimientosListPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
