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

export type Formato = 750 | 700 | 375 | 50;
export type TipoEnvase = "caja" | "plancha";

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
  stock: number;
  cobertura_semanas: number | null;
  semaforo: Semaforo;
}

export interface DashboardStockResponse {
  periodo: { desde: string; hasta: string; dias: number };
  kpis: { stock_total: number; salidas_periodo_total: number };
  cobertura_por_linea: CoberturaLinea[];
  salidas_por_destino: Record<string, number>;
  semaforo_por_sku: Array<{
    producto_id: string;
    descripcion: string;
    stock: number;
    cajas: number;
    sueltas: number;
    cobertura_semanas: number | null;
    semaforo: Semaforo;
    excluir_grafico_principal: boolean;
  }>;
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
