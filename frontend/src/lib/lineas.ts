// Orden en que se muestran las líneas en formularios y listados.
export const ORDEN_LINEAS = ["Matacuy", "Salqa Azul", "Salqa Verde", "Añejo", "Reposado", "Cosecha", "Botanizado", "Licor de Café"];

export function ordenLinea(nombre: string): number {
  const i = ORDEN_LINEAS.indexOf(nombre);
  return i === -1 ? ORDEN_LINEAS.length : i;
}
