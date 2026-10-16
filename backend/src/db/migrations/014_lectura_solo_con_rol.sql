-- Lectura solo para quien tiene rol (fila en perfiles).
-- Antes bastaba con tener cualquier sesion de Supabase (auth.role() = 'authenticated')
-- para leer las tablas por la API directa; ahora hace falta estar en `perfiles`
-- (es decir, que el administrador lo haya autorizado).
drop policy if exists "lectura_autenticados_lineas" on lineas;
drop policy if exists "lectura_autenticados_productos" on productos_terminados;
drop policy if exists "lectura_autenticados_movimientos" on movimientos_terminados;
drop policy if exists "lectura_autenticados_tanques" on tanques_liquidos;
drop policy if exists "lectura_autenticados_snapshots" on stock_liquidos_snapshot;

create policy "lectura_con_rol_lineas" on lineas
  for select using (exists (select 1 from perfiles where id = auth.uid()));
create policy "lectura_con_rol_productos" on productos_terminados
  for select using (exists (select 1 from perfiles where id = auth.uid()));
create policy "lectura_con_rol_movimientos" on movimientos_terminados
  for select using (exists (select 1 from perfiles where id = auth.uid()));
create policy "lectura_con_rol_tanques" on tanques_liquidos
  for select using (exists (select 1 from perfiles where id = auth.uid()));
create policy "lectura_con_rol_snapshots" on stock_liquidos_snapshot
  for select using (exists (select 1 from perfiles where id = auth.uid()));
