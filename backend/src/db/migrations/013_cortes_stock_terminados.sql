-- Cortes de stock de productos terminados: "foto fija" del stock de todos los
-- productos a una fecha y hora. Cada corte guarda su propia copia de los datos
-- (jsonb), asi que no cambia aunque despues haya movimientos o se renombre un
-- producto. `token` es el codigo secreto del link publico (solo lectura) que se
-- puede enviar a cualquiera; `activo = false` retira el corte y su link.
create table if not exists cortes_stock_terminados (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  fecha date not null,
  nota text,
  total_unidades integer not null default 0,
  datos jsonb not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_cortes_stock_fecha on cortes_stock_terminados(created_at desc);

alter table cortes_stock_terminados enable row level security;
grant all privileges on cortes_stock_terminados to service_role;
