export type Rol = "admin" | "socio";

export interface Perfil {
  id: string; // = auth.users.id
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

export const DESTINOS_HABITUALES = [
  "Almacén Lima",
  "Almacén Cusco",
  "Tienda Pachar",
  "Tambo del Inca",
  "El Albergue",
  "Tienda Chuncho",
  "Herbario",
  "Exportación",
] as const;

export type Destino = (typeof DESTINOS_HABITUALES)[number];

export interface MovimientoTerminado {
  id: string;
  producto_id: string;
  fecha: string; // ISO date
  tipo: TipoMovimiento;
  cantidad: number;
  destino: Destino | string | null;
  es_ajuste: boolean;
  motivo: string | null;
}

export type TipoTanque = "terminado" | "subproducto";

export interface TanqueLiquido {
  id: string;
  linea_id: string;
  nombre: string;
  tipo: TipoTanque;
  capacidad_litros: number | null; // null = capacidad sin confirmar, ver TODO en migración
  lote: string | null;
}

export interface StockLiquidoSnapshot {
  id: string;
  tanque_id: string;
  fecha_corte: string; // ISO date
  litros: number;
}

export type Semaforo = "rojo" | "naranja" | "verde";
