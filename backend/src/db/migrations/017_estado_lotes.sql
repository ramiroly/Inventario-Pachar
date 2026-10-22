-- Estado de cada lote de liquido terminado: en proceso -> en reposo -> terminado.
-- Solo los lotes en estado 'terminado' (aprobados) se pueden embotellar y suman al
-- total "terminado" de las lineas; los demas se muestran aparte como "en preparacion".
-- Cada cambio de estado queda en cambios_estado_lote y aparece en el Registro.
alter table tanques_liquidos
  add column if not exists estado text not null default 'terminado'
  check (estado in ('proceso', 'reposo', 'terminado'));

create table if not exists cambios_estado_lote (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references tanques_liquidos(id) on delete restrict,
  fecha date not null,
  estado_anterior text not null check (estado_anterior in ('proceso', 'reposo', 'terminado')),
  estado_nuevo text not null check (estado_nuevo in ('proceso', 'reposo', 'terminado')),
  nota text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_cambios_estado_tanque on cambios_estado_lote(tanque_id, fecha);

alter table cambios_estado_lote enable row level security;
grant all privileges on cambios_estado_lote to service_role;
