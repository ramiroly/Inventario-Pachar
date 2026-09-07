// Mismo formato de número que usaban los dashboards HTML originales
// (`.toLocaleString('es-PE')`).
export function formatNum(n: number): string {
  return Math.round(n).toLocaleString("es-PE");
}
