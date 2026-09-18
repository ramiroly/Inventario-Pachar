import type { ReactNode } from "react";
import logoCerros from "../assets/logo-cerros.png";
import styles from "./AuthLayout.module.css";

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ titulo, subtitulo, pie, children }: Props) {
  return (
    <div className={styles.root}>
      <aside className={styles.hero}>
        <img className={styles.logo} src={logoCerros} alt="Destilería Andina" />
        <p className={styles.heroCaption}>Sistema de inventario</p>
      </aside>
      <main className={styles.panel}>
        <div className={styles.card}>
          <h1 className={styles.titulo}>{titulo}</h1>
          {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          {children}
          {pie && <div className={styles.pie}>{pie}</div>}
        </div>
        <p className={styles.legal}>Destilería Andina · Uso interno</p>
      </main>
    </div>
  );
}
