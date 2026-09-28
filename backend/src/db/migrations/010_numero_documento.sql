-- N° de guia de remision (salidas) o N° de produccion/orden (entradas).
-- Texto libre: el mismo numero se repite en varios movimientos para
-- agruparlos en un solo comprobante imprimible. No aplica a ajustes
-- (que ya usan la columna "motivo").
alter table movimientos_terminados
  add column if not exists numero_documento text;

create index if not exists idx_movimientos_numero_documento
  on movimientos_terminados(numero_documento)
  where numero_documento is not null;
