// Fecha de hoy según el reloj del usuario (toISOString usa UTC y en Perú
// adelanta el día después de las 7 pm).
export function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatoFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
