// api.ts lanza el cuerpo de error del backend como JSON en el mensaje; esto lo
// convierte en un texto legible para el usuario.
export function mensajeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  try {
    const detalle = JSON.parse(texto) as { fieldErrors?: Record<string, string[]> };
    const campos = Object.keys(detalle.fieldErrors ?? {});
    if (campos.length > 0) return `Revisa los datos ingresados (${campos.join(", ")}).`;
  } catch {
    // no era JSON: se muestra el texto tal cual
  }
  return texto;
}
