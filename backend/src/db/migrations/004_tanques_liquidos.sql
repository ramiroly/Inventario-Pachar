-- Tanques de líquidos (terminado o subproducto) por línea.
--
-- Las capacidades reales de los 28 tanques existentes al 01/09/2026 están
-- cargadas en seed/seed_tanques_liquidos.sql (extraídas del dashboard
-- histórico de líquidos). capacidad_litros queda NULLABLE para tanques
-- nuevos que se agreguen después y cuya capacidad todavía no se confirmó.
create table if not exists tanques_liquidos (
  id uuid primary key default gen_random_uuid(),
  linea_id uuid not null references lineas(id) on delete restrict,
  nombre text not null,
  tipo text not null check (tipo in ('terminado', 'subproducto')),
  capacidad_litros numeric, -- NULL = capacidad de un tanque nuevo aun sin confirmar
  lote text
);

create index if not exists idx_tanques_linea on tanques_liquidos(linea_id);
