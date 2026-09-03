export interface DesglosePackaging {
  cajas: number;
  sueltas: number;
}

/**
 * cajas = floor(stock / upb)
 * sueltas = stock % upb
 * upb es dato por SKU (ver comentario en migración 002_productos_terminados.sql
 * con las reglas 750/375/700ml=6, 50ml=60 excepto Matacuy 50ml=111).
 */
export function calcularCajasYSueltas(stock: number, upb: number): DesglosePackaging {
  if (upb <= 0) {
    throw new Error(`upb inválido (${upb}): debe ser mayor a 0`);
  }
  return {
    cajas: Math.floor(stock / upb),
    sueltas: stock % upb,
  };
}
