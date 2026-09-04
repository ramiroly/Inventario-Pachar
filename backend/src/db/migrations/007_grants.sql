-- Las migraciones 001-006 crean las tablas con SQL directo (CREATE TABLE),
-- no desde el editor visual de Supabase. Eso salta el paso donde Supabase
-- normalmente otorga permisos automáticos a los roles anon/authenticated/
-- service_role sobre las tablas nuevas — sin este GRANT, hasta el
-- service_role (que se supone bypasea RLS) recibe "permission denied for
-- table X" porque RLS ni siquiera llega a evaluarse sin el permiso base.
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant all privileges on all sequences in schema public to service_role;
grant usage on all sequences in schema public to authenticated;

-- Para que las tablas que se creen de acá en más (nuevas migraciones)
-- también queden con estos permisos sin tener que repetir este archivo.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
