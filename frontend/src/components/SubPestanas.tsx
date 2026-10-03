import { Link } from "react-router-dom";
import styles from "./SubPestanas.module.css";

interface Opcion {
  to: string;
  etiqueta: string;
}

export const SUBPESTANAS_LIQUIDOS: Opcion[] = [
  { to: "/liquidos/cargar/movimiento", etiqueta: "Movimiento" },
  { to: "/liquidos/cargar/corte", etiqueta: "Corte semanal" },
  { to: "/liquidos/cargar/registro", etiqueta: "Registro" },
];

export const SUBPESTANAS_MOVIMIENTOS: Opcion[] = [
  { to: "/movimientos/nuevo", etiqueta: "Movimiento" },
  { to: "/movimientos/registro", etiqueta: "Registro" },
];

// Selector de vistas dentro de una pestaña principal (ej. Cargar líquidos).
export function SubPestanas({ opciones, actual }: { opciones: Opcion[]; actual: string }) {
  return (
    <nav className={styles.selector} aria-label="Vistas">
      {opciones.map((o) => (
        <Link
          key={o.to}
          to={o.to}
          className={o.to === actual ? `${styles.opcion} ${styles.activa}` : styles.opcion}
          aria-current={o.to === actual ? "page" : undefined}
        >
          {o.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
