// Colores reales por línea, extraídos del dashboard histórico
// "INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html" (arrays LC/LCL/LCS).
// Nota: los otros dos dashboards históricos (comparativa y terminados)
// usan variantes de color ligeramente distintas para cada línea — no hay
// una paleta 100% idéntica en los tres. Esta es la que persiste en la
// tabla `lineas` (color_dark/color_light/color_sub) y sirve de fallback
// mientras carga esa data desde la API.
export const LINE_COLORS_FALLBACK: Record<string, { dark: string; light: string; sub: string }> = {
  Matacuy: { dark: "#024A00", light: "#8FBC8E", sub: "#036B00" },
  "Salqa Azul": { dark: "#0B3D6B", light: "#85C1E9", sub: "#1A5276" },
  "Salqa Verde": { dark: "#1E8449", light: "#A9DFBF", sub: "#1E8449" },
  "Añejo": { dark: "#622211", light: "#C8928A", sub: "#7D2D1A" },
  Reposado: { dark: "#117A65", light: "#A2D9CE", sub: "#148F77" },
  Cosecha: { dark: "#7D6608", light: "#F9E79F", sub: "#9A7D0A" },
  Botanizado: { dark: "#009124", light: "#A9DFBF", sub: "#0B7B1E" },
  "Licor de Café": { dark: "#422302", light: "#D7BDE2", sub: "#5D3215" },
};

export function getLineColors(nombreLinea: string) {
  return (
    LINE_COLORS_FALLBACK[nombreLinea] ?? { dark: "#374151", light: "#9ca3af", sub: "#e5e7eb" }
  );
}
