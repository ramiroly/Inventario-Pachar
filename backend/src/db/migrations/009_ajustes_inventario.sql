-- Ajustes por conteo fisico: corrigen el stock sin contar como despacho.
-- Un ajuste sigue siendo entrada (sobrante) o salida (faltante), pero con
-- es_ajuste = true los dashboards lo suman al stock y lo excluyen de
-- "salidas por destino", total despachado y ritmo semanal / cobertura.
alter table movimientos_terminados
  add column if not exists es_ajuste boolean not null default false,
  add column if not exists motivo text;

alter table movimientos_terminados
  drop constraint if exists chk_ajuste_sin_destino;
alter table movimientos_terminados
  add constraint chk_ajuste_sin_destino check (not es_ajuste or destino is null);
