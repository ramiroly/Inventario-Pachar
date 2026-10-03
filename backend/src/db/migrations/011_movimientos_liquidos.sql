-- Movimientos de liquidos (ingresos y egresos por tanque) y manejo de lotes.
--
-- * Cada lote terminado es su propio tanque: al terminarse de embotellar se
--   marca activo = false y deja de aparecer en formularios y dashboards.
-- * movimientos_liquidos guarda cada linea de un registro (mismo
--   numero_documento = mismo comprobante). Los embotellados guardan el
--   producto y las unidades; los litros salen de unidades x formato / 1000.
-- * El corte semanal (stock_liquidos_snapshot) sigue siendo la medida oficial:
--   los movimientos solo calculan los litros esperados para ese corte.
alter table tanques_liquidos
  add column if not exists activo boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create table if not exists movimientos_liquidos (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references tanques_liquidos(id) on delete restrict,
  fecha date not null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  litros numeric not null check (litros > 0),
  motivo text not null check (motivo in ('lote', 'destilacion', 'embotellado', 'otro')),
  numero_documento text,
  nota text,
  producto_id uuid references productos_terminados(id) on delete restrict,
  unidades integer check (unidades > 0),
  created_at timestamptz not null default now(),
  constraint chk_liquidos_embotellado check (
    (motivo = 'embotellado') = (producto_id is not null and unidades is not null)
  ),
  constraint chk_liquidos_embotellado_egreso check (motivo <> 'embotellado' or tipo = 'egreso')
);

create index if not exists idx_mov_liquidos_tanque_fecha on movimientos_liquidos(tanque_id, fecha);
create index if not exists idx_mov_liquidos_documento
  on movimientos_liquidos(numero_documento)
  where numero_documento is not null;

alter table movimientos_liquidos enable row level security;
grant all privileges on movimientos_liquidos to service_role;
