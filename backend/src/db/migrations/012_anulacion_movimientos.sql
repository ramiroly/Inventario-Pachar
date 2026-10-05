-- Anulacion de movimientos: no se borra nada, el movimiento queda en el registro
-- marcado como anulado (con motivo, fecha y quien lo anulo) y deja de contar en
-- saldos, stock, dashboards y comprobantes.
alter table movimientos_terminados
  add column if not exists anulado boolean not null default false,
  add column if not exists anulado_motivo text,
  add column if not exists anulado_at timestamptz,
  add column if not exists anulado_por uuid;

alter table movimientos_liquidos
  add column if not exists anulado boolean not null default false,
  add column if not exists anulado_motivo text,
  add column if not exists anulado_at timestamptz,
  add column if not exists anulado_por uuid;
