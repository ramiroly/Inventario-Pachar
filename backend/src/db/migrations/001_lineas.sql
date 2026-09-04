-- Líneas de producto (Matacuy, Salqa Azul, etc.)
create table if not exists lineas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  -- Hex reales cargados en seed/seed_lineas.sql (extraídos del dashboard
  -- histórico de líquidos). Nullable por si se agrega una línea nueva
  -- antes de definir su color.
  color_dark text,
  color_light text,
  color_sub text
);
