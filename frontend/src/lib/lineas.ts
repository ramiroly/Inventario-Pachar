// Orden en que se muestran las líneas en formularios y listados.
export const ORDEN_LINEAS = ["Matacuy", "Salqa Azul", "Salqa Verde", "Añejo", "Reposado", "Cosecha", "Botanizado", "Licor de Café", "Caña Mater"];

export function ordenLinea(nombre: string): number {
  const i = ORDEN_LINEAS.indexOf(nombre);
  return i === -1 ? ORDEN_LINEAS.length : i;
}

// Orden de los productos dentro de cada línea: 750 ml, 375 ml, 50 ml, luego los de exportación
// (700 ml y 750 ml inglés) y al final las garrafas de 4 L.
export function ordenProducto(p: { formato: number; es_exportacion: boolean }): number {
  if (p.formato === 4000) return 5;
  if (p.es_exportacion) return p.formato === 700 ? 3 : 4;
  const i = [750, 375, 50].indexOf(p.formato);
  return i === -1 ? 3 : i;
}
