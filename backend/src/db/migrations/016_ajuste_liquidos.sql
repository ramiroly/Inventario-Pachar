-- Ajuste de liquidos: corrige el nivel de un tanque segun lo medido realmente
-- (como el ajuste por conteo fisico de productos terminados). Se guarda como un
-- ingreso o egreso con motivo 'ajuste' por la diferencia.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'movimientos_liquidos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%destilacion%'
  loop
    execute format('alter table movimientos_liquidos drop constraint %I', c.conname);
  end loop;
end $$;

alter table movimientos_liquidos
  add constraint movimientos_liquidos_motivo_check
  check (motivo in ('lote', 'destilacion', 'embotellado', 'otro', 'ajuste'));
