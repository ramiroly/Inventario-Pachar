export interface ComparativaLiquido {
  delta: number;
  loteNuevo: boolean;
}

/**
 * delta = litros_actual - litros_periodo_anterior
 * Nuevo lote si prev=0 y litros_actual>0.
 */
export function compararLiquido(litrosActual: number, litrosAnterior: number): ComparativaLiquido {
  return {
    delta: litrosActual - litrosAnterior,
    loteNuevo: litrosAnterior === 0 && litrosActual > 0,
  };
}
