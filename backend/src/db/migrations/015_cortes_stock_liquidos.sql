-- Cortes de stock de liquidos: "foto fija" de los litros de todos los tanques a una
-- fecha y hora, con link publico de solo lectura. Funciona igual que
-- cortes_stock_terminados (migracion 013): `datos` guarda su propia copia, `token`
-- es el codigo secreto del link y `activo = false` retira el corte y su link.
create table if not exists cortes_stock_liquidos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  fecha date not null,
  nota text,
  total_litros numeric not null default 0,
  datos jsonb not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_cortes_stock_liquidos_fecha on cortes_stock_liquidos(created_at desc);

alter table cortes_stock_liquidos enable row level security;
grant all privileges on cortes_stock_liquidos to service_role;
