// TODO: reemplazar con los hex reales de los dashboards HTML históricos
// (spec pide mantener la paleta por línea para continuidad visual).
// Placeholder mientras Ramiro confirma los valores exactos.
export const LINE_COLORS_PLACEHOLDER: Record<string, { dark: string; light: string; sub: string }> = {
  Matacuy: { dark: "#7c2d12", light: "#fb923c", sub: "#fed7aa" },
  "Salqa Azul": { dark: "#1e3a8a", light: "#60a5fa", sub: "#bfdbfe" },
  "Salqa Verde": { dark: "#14532d", light: "#4ade80", sub: "#bbf7d0" },
  "Añejo": { dark: "#78350f", light: "#d97706", sub: "#fde68a" },
  Reposado: { dark: "#581c87", light: "#a855f7", sub: "#e9d5ff" },
  Cosecha: { dark: "#831843", light: "#ec4899", sub: "#fbcfe8" },
  Botanizado: { dark: "#134e4a", light: "#2dd4bf", sub: "#99f6e4" },
  "Licor de Café": { dark: "#3f2d1c", light: "#a16207", sub: "#fef3c7" },
};

export function getLineColors(nombreLinea: string) {
  return (
    LINE_COLORS_PLACEHOLDER[nombreLinea] ?? { dark: "#374151", light: "#9ca3af", sub: "#e5e7eb" }
  );
}
