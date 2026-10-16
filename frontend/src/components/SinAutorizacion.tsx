import { AuthLayout } from "./AuthLayout";
import styles from "./AuthLayout.module.css";
import { supabase } from "../lib/supabaseClient";

// Pantalla para quien inició sesión pero el administrador todavía no le dio un rol.
export function SinAutorizacion({ email }: { email: string | undefined }) {
  return (
    <AuthLayout
      titulo="Acceso no autorizado"
      subtitulo={
        <>
          La cuenta <strong>{email}</strong> todavía no tiene permiso para usar este sistema. Pídele al administrador que
          te autorice y vuelve a ingresar.
        </>
      }
    >
      <button type="button" className={styles.button} onClick={() => supabase.auth.signOut()}>
        Cerrar sesión
      </button>
    </AuthLayout>
  );
}
