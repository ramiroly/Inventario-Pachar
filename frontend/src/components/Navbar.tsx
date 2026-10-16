import { NavLink, useLocation } from "react-router-dom";
import logoMarca from "../assets/logo-marca.png";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import styles from "./Navbar.module.css";

const ETIQUETA_ROL = { admin: "Admin", socio: "Socio" } as const;

export function Navbar() {
  const { session, rol, loading } = useAuth();
  const { pathname } = useLocation();
  // El link publico de un corte (/corte/...) se ve limpio, sin menu, aunque haya sesion abierta.
  if (!session || pathname.startsWith("/corte/")) return null;
  // Sin rol asignado: solo se puede salir; no se muestran las pestañas.
  const sinRol = !loading && rol === null;

  const claseLink = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand} aria-label="Ir al inicio">
          <img className={styles.logo} src={logoMarca} alt="Destilería Andina" />
        </NavLink>

        {!sinRol && (
        <nav className={styles.links} aria-label="Principal">
          {rol === "admin" && (
            <NavLink to="/movimientos" className={claseLink}>
              Cargar movimiento
            </NavLink>
          )}
          {rol === "admin" && (
            <NavLink to="/liquidos/cargar" className={claseLink}>
              Cargar líquidos
            </NavLink>
          )}
          <NavLink to="/stock" className={claseLink}>
            Stock
          </NavLink>
          <NavLink to="/comparativo" className={claseLink}>
            Comparativo
          </NavLink>
          <NavLink to="/liquidos" end className={claseLink}>
            Líquidos
          </NavLink>
        </nav>
        )}

        <div className={styles.user}>
          <span className={styles.email}>{session.user.email}</span>
          <span className={rol === "admin" ? `${styles.role} ${styles.roleAdmin}` : styles.role}>
            {rol ? ETIQUETA_ROL[rol] : "Sin rol"}
          </span>
          <button className={styles.salir} onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
