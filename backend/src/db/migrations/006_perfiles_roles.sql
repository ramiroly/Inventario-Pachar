-- Roles de usuario para Supabase Auth.
-- Supabase no tiene roles por fila nativos: se modela con una tabla propia
-- vinculada 1:1 a auth.users, y se usa en RLS + en el middleware del backend
-- (requireRole.ts) para distinguir Admin (Ramiro, Walter) de Socios
-- (Haresh, Ishmael, Joaquín, solo lectura).
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('admin', 'socio')),
  nombre text
);

alter table lineas enable row level security;
alter table productos_terminados enable row level security;
alter table movimientos_terminados enable row level security;
alter table tanques_liquidos enable row level security;
alter table stock_liquidos_snapshot enable row level security;
alter table perfiles enable row level security;

-- Lectura: cualquier usuario autenticado (admin o socio) puede ver todo.
create policy "lectura_autenticados_lineas" on lineas
  for select using (auth.role() = 'authenticated');
create policy "lectura_autenticados_productos" on productos_terminados
  for select using (auth.role() = 'authenticated');
create policy "lectura_autenticados_movimientos" on movimientos_terminados
  for select using (auth.role() = 'authenticated');
create policy "lectura_autenticados_tanques" on tanques_liquidos
  for select using (auth.role() = 'authenticated');
create policy "lectura_autenticados_snapshots" on stock_liquidos_snapshot
  for select using (auth.role() = 'authenticated');
create policy "lectura_propio_perfil" on perfiles
  for select using (auth.uid() = id);

-- Escritura: solo admin (según su fila en perfiles).
create policy "escritura_admin_productos" on productos_terminados
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
create policy "escritura_admin_movimientos" on movimientos_terminados
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
create policy "escritura_admin_tanques" on tanques_liquidos
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
create policy "escritura_admin_snapshots" on stock_liquidos_snapshot
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
