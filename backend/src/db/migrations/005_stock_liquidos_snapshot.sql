-- Un snapshot por corte (semanal) de litros en cada tanque, para poder
-- comparar semana vs semana (ver liquidComparison.service.ts).
create table if not exists stock_liquidos_snapshot (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references tanques_liquidos(id) on delete cascade,
  fecha_corte date not null,
  litros numeric not null check (litros >= 0),
  unique (tanque_id, fecha_corte)
);

create index if not exists idx_snapshot_tanque_fecha on stock_liquidos_snapshot(tanque_id, fecha_corte);
