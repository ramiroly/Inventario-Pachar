export type Rol = "admin" | "socio";

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string | null;
}

export interface Linea {
  id: string;
  nombre: string;
  color_dark: string | null;
  color_light: string | null;
  color_sub: string | null;
}

export type Formato = 750 | 700 | 375 | 50 | 4000;
export type TipoEnvase = "caja" | "plancha" | "unidad";

export interface ProductoTerminado {
  id: string;
  linea_id: string;
  descripcion: string;
  formato: Formato;
  upb: number;
  tipo_envase: TipoEnvase;
  es_exportacion: boolean;
}

export type TipoMovimiento = "entrada" | "salida";

export interface MovimientoTerminado {
  id: string;
  producto_id: string;
  fecha: string;
  tipo: TipoMovimiento;
  cantidad: number;
  destino: string | null;
}

export type TipoTanque = "terminado" | "subproducto";

export interface TanqueLiquido {
  id: string;
  linea_id: string;
  nombre: string;
  tipo: TipoTanque;
  capacidad_litros: number | null;
  lote: string | null;
}

export type Semaforo = "rojo" | "naranja" | "verde";

export interface CoberturaLinea {
  linea_id: string;
  nombre: string;
  color_dark: string | null;
  color_light: string | null;
  color_sub: string | null;
  stock: number;
  salidas_periodo: number;
  weekly_rate: number;
  cobertura_semanas: number | null;
  semaforo: Semaforo;
}

export interface ProductoDashboard {
  producto_id: string;
  descripcion: string;
  linea_id: string;
  linea: string;
  formato: Formato;
  upb: number;
  tipo_envase: TipoEnvase;
  es_exportacion: boolean;
  stock: number;
  cajas: number;
  sueltas: number;
  cobertura_semanas: number | null;
  semaforo: Semaforo;
  excluir_grafico_principal: boolean;
}

export interface SalidaPorDestino {
  destino: string;
  total: number;
  por_linea: Record<string, number>;
}

export interface DashboardStockResponse {
  periodo: { desde: string; hasta: string; dias: number };
  kpis: { stock_total: number; salidas_periodo_total: number };
  lineas: CoberturaLinea[];
  productos: ProductoDashboard[];
  salidas: { total: number; por_destino: SalidaPorDestino[] };
}

export interface DetalleFormatoComparativo {
  producto_id: string;
  linea_id: string;
  linea: string;
  descripcion: string;
  formato: Formato;
  upb: number;
  tipo_envase: TipoEnvase;
  stock_actual: number;
  stock_anterior: number;
  variacion: number;
}

export interface TotalPorLinea {
  linea_id: string;
  nombre: string;
  stock_actual: number;
  stock_anterior: number;
}

export interface DashboardComparativoResponse {
  fecha_corte: string;
  fecha_corte_anterior: string;
  detalle_por_formato: DetalleFormatoComparativo[];
  totales_por_linea: TotalPorLinea[];
}

export interface DashboardLiquidosResponse {
  tanques: Array<{
    tanque_id: string;
    linea_id: string;
    nombre: string;
    tipo: TipoTanque;
    capacidad_litros: number | null;
    litros_actual: number;
    litros_anterior: number;
    delta: number;
    lote_nuevo: boolean;
    fecha_corte: string | null;
  }>;
}
