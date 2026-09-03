import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardStockPage } from "./pages/DashboardStockPage";
import { DashboardComparativoPage } from "./pages/DashboardComparativoPage";
import { DashboardLiquidosPage } from "./pages/DashboardLiquidosPage";
import { MovimientosFormPage } from "./pages/MovimientosFormPage";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardStockPage />
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
