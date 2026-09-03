import type { Semaforo } from "../types/models.js";

/**
 * Cobertura (terminados), fórmula validada en la spec:
 *   semanas_periodo = dias_periodo / 7
 *   tasa_semanal = total_salidas_linea_periodo / semanas_periodo
 *   cobertura_semanas = stock_actual_linea / tasa_semanal
 */
export function calcularCoberturaSemanas(
  stockActual: number,
  totalSalidasPeriodo: number,
  diasPeriodo: number
): number | null {
  const semanasPeriodo = diasPeriodo / 7;
  if (semanasPeriodo <= 0) return null;

  const tasaSemanal = totalSalidasPeriodo / semanasPeriodo;
  if (tasaSemanal <= 0) return null; // sin salidas en el período: cobertura indefinida

  return stockActual / tasaSemanal;
}

/** Semáforo: 🔴 <2 sem · 🟠 2–4 sem · 🟢 >4 sem */
export function calcularSemaforo(coberturaSemanas: number | null): Semaforo {
  if (coberturaSemanas === null) return "rojo";
  if (coberturaSemanas < 2) return "rojo";
  if (coberturaSemanas <= 4) return "naranja";
  return "verde";
}
