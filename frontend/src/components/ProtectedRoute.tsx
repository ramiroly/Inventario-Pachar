import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import type { Rol } from "../types/models";

interface Props {
  children: ReactNode;
  rolRequerido?: Rol; // "admin" = solo admin. Sin especificar = cualquier usuario autenticado.
}

export function ProtectedRoute({ children, rolRequerido }: Props) {
  const { session, rol, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (rolRequerido === "admin" && rol !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
