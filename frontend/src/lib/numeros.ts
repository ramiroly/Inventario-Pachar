export const formatoLitros = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 3 });

// Acepta "1200", "12.5" y "12,5". Devuelve null si el texto no es un número válido.
export function parseLitros(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

export const conSignoLitros = (n: number) => `${n > 0 ? "+" : ""}${formatoLitros(n)} L`;
